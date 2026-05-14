import os
import shutil
import bcrypt
import secrets
import string
import boto3 # S3/R2 Client
import fitz  # NEW: PyMuPDF for extracting text from PDFs
import google.generativeai as genai # NEW: Google Gemini AI
from sqlalchemy import text # NEW: For raw SQL embedding queries
from urllib.parse import urlparse
from uuid import uuid4
from typing import List
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel, Field

import database, models
from email_utils import send_staff_credentials_email

app = FastAPI()

# --- SETUP CLOUDFLARE R2 CLIENT ---
s3_client = boto3.client(
    's3',
    endpoint_url=os.getenv("R2_ENDPOINT_URL"),
    aws_access_key_id=os.getenv("R2_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY")
)
R2_BUCKET = os.getenv("R2_BUCKET_NAME")

# --- SETUP GOOGLE GEMINI AI ---
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# 1. Update the Generative Model to Gemini 3.1 Flash Lite
llm = genai.GenerativeModel('gemini-3.1-flash-lite')

def get_embedding(text_string: str):
    """Converts text into a 768-dimension vector."""
    result = genai.embed_content(
        model="models/gemini-embedding-2",  # <--- NEW: Uses the 2026 embedding model
        content=text_string,
        task_type="retrieval_document"
    )
    return result['embedding']


@app.on_event("startup")
def create_tables() -> None:
    database.Base.metadata.create_all(bind=database.engine)

# Enable CORS for React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure the local uploads directory exists (Legacy fallback/safeguard)
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- Request Schemas ---
class LoginReq(BaseModel):
    email: str
    password: str
    role: str

class StaffCreate(BaseModel):
    username: str
    full_name: str

class StaffUpdate(BaseModel):
    username: str
    password: str | None = None
    full_name: str
    role: str | None = None

class ProfileUpdate(BaseModel):
    full_name: str
    password: str | None = None

class IntegrationUpdate(BaseModel):
    mode: str
    provider: str | None = None
    config: dict = Field(default_factory=dict)

class ChatRequest(BaseModel): # NEW: Schema for AI chat
    message: str

def _normalize_username(username: str) -> str:
    clean = username.strip().lower()
    if clean.endswith("@safeway.com"):
        clean = clean[:-12]
    return clean

def _generate_random_password(length: int = 12) -> str:
    """Generate a random secure password with letters, numbers, and special characters."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*_-=+"
    password = ''.join(secrets.choice(alphabet) for _ in range(length))
    return password

def _detect_database_provider() -> str:
    database_url = os.getenv("DATABASE_URL", "")
    if not database_url:
        return os.getenv("DEFAULT_DATABASE_PROVIDER", "postgresql")

    parsed_url = urlparse(database_url)
    host = (parsed_url.hostname or "").lower()

    if "neon.tech" in host:
        return "neon"

    return os.getenv("DEFAULT_DATABASE_PROVIDER", "postgresql")

def _default_database_config() -> dict:
    database_url = (os.getenv("DEFAULT_DATABASE_URL") or os.getenv("DATABASE_URL") or "").strip()
    database_name = os.getenv("DEFAULT_DATABASE_NAME", "").strip()

    if database_url and not database_name:
        database_name = urlparse(database_url).path.lstrip("/")

    return {
        "connection_string": database_url,
        "database_name": database_name
    }

SUPPORTED_INTEGRATION_CATEGORIES = {"database", "cloudstorage"}
DEFAULT_INTEGRATION_SETTINGS = {
    "database": {
        "provider": _detect_database_provider(),
        "config": _default_database_config()
    },
    "cloudstorage": {
        "provider": os.getenv("DEFAULT_CLOUD_PROVIDER", "local"),
        "config": {
            "endpoint": os.getenv("DEFAULT_CLOUD_ENDPOINT", ""),
            "bucket_name": os.getenv("DEFAULT_CLOUD_BUCKET", ""),
            "access_key": os.getenv("DEFAULT_CLOUD_ACCESS_KEY", ""),
            "secret_key": os.getenv("DEFAULT_CLOUD_SECRET_KEY", "")
        }
    }
}

def _default_integration_payload(category: str) -> dict:
    defaults = DEFAULT_INTEGRATION_SETTINGS[category]
    return {
        "category": category,
        "mode": "default",
        "provider": defaults["provider"],
        "source": "default",
        "config": dict(defaults["config"])
    }

def _integration_payload(category: str, db: Session) -> dict:
    defaults = DEFAULT_INTEGRATION_SETTINGS[category]
    setting = db.query(models.IntegrationSetting).filter(models.IntegrationSetting.category == category).first()

    if not setting:
        return _default_integration_payload(category)

    config = dict(defaults["config"])
    config.update(setting.config or {})

    return {
        "category": category,
        "mode": "custom",
        "provider": setting.provider,
        "source": "new_api_choose",
        "config": config
    }

def _integration_response(db: Session) -> dict:
    return {category: _integration_payload(category, db) for category in SUPPORTED_INTEGRATION_CATEGORIES}

def _normalize_config_payload(config: dict | None) -> dict:
    cleaned = {}
    for key, value in (config or {}).items():
        if value is None:
            continue
        if isinstance(value, str):
            value = value.strip()
        if value == "":
            continue
        cleaned[key] = value
    return cleaned

def _resolve_database_url(provider: str, config: dict) -> str:
    connection_string = (config.get("connection_string") or "").strip()
    if connection_string:
        return connection_string

    return (config.get("database_url") or os.getenv("DATABASE_URL", "")).strip()

def _apply_database_connection(provider: str, config: dict) -> dict:
    database_url = _resolve_database_url(provider, config)
    if not database_url:
        raise HTTPException(status_code=400, detail="Database URL is required for custom database mode")

    os.environ["DATABASE_URL"] = database_url
    database.configure_database(database_url)
    database.create_tables()

    updated_config = dict(config)
    updated_config["connection_string"] = database_url
    updated_config.setdefault("database_name", urlparse(database_url).path.lstrip("/") or updated_config.get("database_name", ""))
    return updated_config

# --- Authentication ---
@app.post("/api/login")
def login(req: LoginReq, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user or not bcrypt.checkpw(req.password.encode('utf-8'), user.password_hash.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user.role != req.role:
        raise HTTPException(status_code=403, detail=f"This portal is for {req.role}s only")

    return {
        "id": str(user.id),
        "email": user.email,
        "role": user.role,
        "name": user.full_name
    }

# --- Profile Management ---
@app.get("/api/profile/{uid}")
def get_profile(uid: str, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.id == uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": str(user.id),
        "email": user.email,
        "role": user.role,
        "full_name": user.full_name
    }

@app.put("/api/profile/{uid}")
def update_profile(uid: str, req: ProfileUpdate, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.id == uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.full_name = req.full_name

    if req.password and req.password.strip():
        user.password_hash = bcrypt.hashpw(req.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    db.commit()

    return {
        "message": "Profile updated successfully",
        "id": str(user.id),
        "email": user.email,
        "role": user.role,
        "full_name": user.full_name
    }

# --- Admin: Integration Settings ---
@app.get("/api/admin/integrations")
def get_integrations(db: Session = Depends(database.get_db)):
    return _integration_response(db)

@app.put("/api/admin/integrations/{category}")
def update_integration(category: str, req: IntegrationUpdate, db: Session = Depends(database.get_db)):
    if category not in SUPPORTED_INTEGRATION_CATEGORIES:
        raise HTTPException(status_code=400, detail="Unsupported integration category")

    mode = req.mode.strip().lower()
    if mode not in {"default", "custom"}:
        raise HTTPException(status_code=400, detail="Mode must be 'default' or 'custom'")

    setting = db.query(models.IntegrationSetting).filter(models.IntegrationSetting.category == category).first()

    if mode == "default":
        if setting:
            db.delete(setting)
            db.commit()
        return _default_integration_payload(category)

    provider = (req.provider or "").strip()
    if not provider:
        raise HTTPException(status_code=400, detail="Provider is required for custom mode")

    config = _normalize_config_payload(req.config)
    if setting:
        setting.provider = provider
        setting.mode = "custom"
        setting.config = config
    else:
        setting = models.IntegrationSetting(
            category=category,
            provider=provider,
            mode="custom",
            config=config
        )
        db.add(setting)

    db.commit()

    if category == "database" and mode == "custom":
        applied_config = _apply_database_connection(provider, config)
        setting.config = applied_config
        db.commit()

    return _integration_payload(category, db)

# --- Admin: Staff Management ---
@app.get("/api/admin/users")
def get_users(db: Session = Depends(database.get_db)):
    return db.query(models.User).all()

@app.post("/api/admin/users")
def create_staff(req: StaffCreate, db: Session = Depends(database.get_db)):
    email = f"{req.username}@safeway.com"

    if db.query(models.User).filter(models.User.email == email).first():
        raise HTTPException(status_code=400, detail="Username already exists")

    generated_password = _generate_random_password()
    hashed = bcrypt.hashpw(generated_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    new_user = models.User(email=email, password_hash=hashed, full_name=req.full_name, role="staff")
    db.add(new_user)
    db.commit()

    send_staff_credentials_email(email, generated_password)

    return {
        "message": "Success",
        "password": generated_password,
        "email": email
    }

@app.put("/api/admin/users/{uid}")
def update_staff(uid: str, req: StaffUpdate, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.id == uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    username = _normalize_username(req.username)
    user.email = f"{username}@safeway.com"
    user.full_name = req.full_name

    if req.password and req.password.strip():
        user.password_hash = bcrypt.hashpw(req.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    if req.role in {"staff", "admin"}:
        user.role = req.role

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Staff email already exists")

    return {"message": "Updated"}

@app.delete("/api/admin/users/{uid}")
def delete_user(uid: str, db: Session = Depends(database.get_db)):
    db.query(models.User).filter(models.User.id == uid).delete()
    db.commit()
    return {"message": "Deleted"}

# --- Admin: Knowledge Base Management (CLOUDFLARE R2 + AI EXTRACTION) ---

@app.get("/api/admin/documents")
def get_docs(db: Session = Depends(database.get_db)):
    return db.query(models.KnowledgeBase).all()

@app.post("/api/admin/upload")
async def upload_document(
        title: str = Form(...),
        category: str = Form(...),
        admin_id: str = Form(...),
        file: UploadFile = File(...),
        db: Session = Depends(database.get_db)
):
    # 1. Validate File Extension
    extension = file.filename.split(".")[-1].lower()
    if extension not in ["pdf", "txt"]:
        raise HTTPException(status_code=400, detail="Only PDF and TXT are supported for AI indexing.")

    # 2. Create Unique Filename & Read File into Memory
    unique_filename = f"{uuid4()}.{extension}"
    file_bytes = await file.read()

    # 3. Upload to Cloudflare R2
    try:
        s3_client.put_object(
            Bucket=R2_BUCKET,
            Key=unique_filename,
            Body=file_bytes,
            ContentType=file.content_type
        )
    except Exception as e:
        print("R2 Upload Error:", str(e))
        raise HTTPException(status_code=500, detail="Internal server error saving file to Cloud Storage.")

    # 4. Extract Text for AI (NEW)
    extracted_text = ""
    try:
        if extension == "pdf":
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            for page in doc:
                extracted_text += page.get_text() + "\n"
        elif extension == "txt":
            extracted_text = file_bytes.decode('utf-8')
    except Exception as e:
        print("Text Extraction Error:", str(e))
        raise HTTPException(status_code=500, detail="Could not read the text from the file.")

    # 5. Save Main Record to Database (Neon DB)
    try:
        new_doc = models.KnowledgeBase(
            title=title,
            category=category,
            file_path=unique_filename,
            file_type=extension,
            file_size=len(file_bytes),
            uploaded_by=admin_id
        )
        db.add(new_doc)
        db.commit()
        db.refresh(new_doc)

        # 6. CHUNK AND EMBED FOR AI RAG (NEW)
        # Break the manual into 1000-character paragraphs
        chunks = [extracted_text[i:i+1000] for i in range(0, len(extracted_text), 1000)]
        for chunk in chunks:
            if len(chunk.strip()) > 20: # Ignore tiny/empty chunks
                vector = get_embedding(chunk)
                db.execute(text('''
                                INSERT INTO "AI chatbot"."document_chunks" (doc_id, content, embedding)
                                VALUES (:d, :c, :e)
                                '''), {"d": new_doc.id, "c": chunk, "e": str(vector)})
        db.commit()

        return {"message": "Document uploaded and AI trained successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/admin/documents/{did}")
def delete_doc(did: int, db: Session = Depends(database.get_db)):
    doc = db.query(models.KnowledgeBase).filter(models.KnowledgeBase.id == did).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete physical file from Cloudflare R2
    if doc.file_path:
        try:
            s3_client.delete_object(Bucket=R2_BUCKET, Key=doc.file_path)
        except Exception as e:
            print("R2 Delete Error:", str(e))

    # Delete DB record (This will automatically delete the AI chunks if ON DELETE CASCADE is set in SQL)
    db.delete(doc)
    db.commit()
    return {"message": "Document and physical file deleted"}

# --- AI Chatbot Brain (NEW) ---
@app.post("/api/chat")
async def chat_with_ai(req: ChatRequest, db: Session = Depends(database.get_db)):
    try:
        # 1. Turn the user's question into a math vector
        query_vector = get_embedding(req.message)

        # 2. Search Neon DB for the 4 most relevant paragraphs (<=> is Cosine Distance)
        search_query = text('''
                            SELECT content FROM "AI chatbot"."document_chunks"
                            ORDER BY embedding <=> :v LIMIT 4
                            ''')
        results = db.execute(search_query, {"v": str(query_vector)}).fetchall()

        if not results:
            return {"sender": "bot", "message": "I don't have any manuals covering this topic yet."}

        context_text = "\n\n---\n\n".join([r[0] for r in results])

        # 3. Ask Gemini to answer based ONLY on the context
        prompt = f"""
        You are the Safeway Sdn Bhd Internal Assistant. 
        Answer the staff's question using ONLY the provided internal document context. 
        If the answer is not in the context, say "I cannot find this information in the internal documents." Do not invent answers or use outside knowledge.

        CONTEXT:
        {context_text}

        QUESTION:
        {req.message}
        """

        ai_response = llm.generate_content(prompt)

        return {"sender": "bot", "message": ai_response.text}

    except Exception as e:
        print("AI Chat Error:", e)
        return {"sender": "bot", "message": "The AI servers are currently busy. Please try again."}
