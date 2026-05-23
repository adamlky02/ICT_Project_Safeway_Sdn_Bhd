import os
import shutil
import bcrypt
import secrets
import string
import boto3
import fitz
import google.generativeai as genai
from sqlalchemy import text, func # NEW: Added func for calculating storage
from urllib.parse import urlparse
from uuid import uuid4
from typing import List
import io
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel, Field

import database, models
from email_utils import send_staff_credentials_email

app = FastAPI()

STAFF_EMAIL_DOMAIN = "gmail.com"

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
llm = genai.GenerativeModel('gemini-3.1-flash-lite')

def get_embedding(text_string: str):
    """Converts text into a 3072-dimension vector."""
    result = genai.embed_content(
        model="models/gemini-embedding-2",
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

class ChatRequest(BaseModel):
    message: str

def _normalize_username(username: str) -> str:
    clean = username.strip().lower()
    for domain in (STAFF_EMAIL_DOMAIN, "safeway.com"):
        suffix = f"@{domain}"
        if clean.endswith(suffix):
            clean = clean[:-len(suffix)]
            break
    return clean

def _generate_random_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*_-=+"
    password = ''.join(secrets.choice(alphabet) for _ in range(length))
    return password

# --- Authentication ---
@app.post("/api/login")
def login(req: LoginReq, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user or not bcrypt.checkpw(req.password.encode('utf-8'), user.password_hash.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    # Allow admin users to access staff portal: if an admin logs in requesting the
    # 'staff' portal, treat them as permitted. Otherwise enforce exact role match.
    if user.role != req.role and not (user.role == "admin" and req.role == "staff"):
        raise HTTPException(status_code=403, detail=f"This portal is for {req.role}s only")

    # If an admin is accessing the staff portal, return the requested role
    # (so frontend routing/guards expecting 'staff' continue to work).
    response_role = req.role if (user.role == "admin" and req.role == "staff") else user.role

    return {
        "id": str(user.id),
        "email": user.email,
        "role": response_role,
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


# --- Admin: Analytics & System Health (NEW) ---
@app.get("/api/admin/analytics")
def get_analytics(db: Session = Depends(database.get_db)):
    user_count = db.query(models.User).count()
    doc_count = db.query(models.KnowledgeBase).count()

    # Calculate storage size securely on the server
    total_size_result = db.query(func.sum(models.KnowledgeBase.file_size)).scalar()
    total_size_bytes = total_size_result if total_size_result else 0
    total_size_mb = round(total_size_bytes / (1024 * 1024), 2)

    return {
        "total_users": user_count,
        "total_docs": doc_count,
        "total_storage_mb": total_size_mb,
        "status": {
            "database": "operational",
            "storage": "operational",
            "ai": "operational"
        }
    }


# --- Admin: Staff Management ---
@app.get("/api/admin/users")
def get_users(db: Session = Depends(database.get_db)):
    return db.query(models.User).all()

@app.post("/api/admin/users")
def create_staff(req: StaffCreate, db: Session = Depends(database.get_db)):
    email = f"{_normalize_username(req.username)}@{STAFF_EMAIL_DOMAIN}"

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
    user.email = f"{username}@{STAFF_EMAIL_DOMAIN}"
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

# --- Admin: Knowledge Base Management (CLOUDFLARE R2) ---

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
    extension = file.filename.split(".")[-1].lower()
    if extension not in ["pdf", "txt"]:
        raise HTTPException(status_code=400, detail="Only PDF and TXT are supported for AI indexing.")

    unique_filename = f"{uuid4()}.{extension}"
    file_bytes = await file.read()

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

        chunks = [extracted_text[i:i+1000] for i in range(0, len(extracted_text), 1000)]
        for chunk in chunks:
            if len(chunk.strip()) > 20:
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

    if doc.file_path:
        try:
            s3_client.delete_object(Bucket=R2_BUCKET, Key=doc.file_path)
        except Exception as e:
            print("R2 Delete Error:", str(e))

    db.delete(doc)
    db.commit()
    return {"message": "Document and physical file deleted"}

# --- PDF VIEWER ROUTE ---
@app.get("/api/files/{filename}")
async def get_file(filename: str):
    try:
        obj = s3_client.get_object(Bucket=R2_BUCKET, Key=filename)
        return StreamingResponse(io.BytesIO(obj['Body'].read()), media_type="application/pdf")
    except Exception as e:
        file_path = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(file_path):
            return FileResponse(file_path)
        raise HTTPException(status_code=404, detail="PDF File not found")

# --- AI Chatbot Brain ---
@app.post("/api/chat")
async def chat_with_ai(req: ChatRequest, db: Session = Depends(database.get_db)):
    try:
        query_vector = get_embedding(req.message)

        search_query = text('''
                            SELECT c.content, k.title, k.category, k.file_path
                            FROM "AI chatbot"."document_chunks" c
                                     JOIN "AI chatbot"."knowledge_base" k ON c.doc_id = k.id
                            ORDER BY c.embedding <=> :v LIMIT 4
                            ''')
        results = db.execute(search_query, {"v": str(query_vector)}).fetchall()

        if not results:
            return {"sender": "bot", "message": "I don't have any manuals covering this topic yet.", "sources": []}

        context_parts = []
        sources_list = []

        for content, title, category, file_path in results:
            context_parts.append(f"DOCUMENT TITLE: {title} | CATEGORY: {category}\nTEXT: {content}")
            sources_list.append({
                "title": title,
                "category": category,
                "content": content.strip(),
                "file_path": file_path
            })

        context_text = "\n\n---\n\n".join(context_parts)

        prompt = f"""
        You are the Safeway Sdn Bhd Internal Assistant, a friendly, professional, and highly helpful AI colleague.
        Your goal is to answer the staff member's question naturally and clearly.

        CRITICAL LANGUAGE RULE: 
        You MUST detect the language of the 'STAFF MEMBER'S QUESTION' (English, Malay, or Chinese). 
        You MUST write your entire response in that EXACT SAME language. Do not mix languages.

        RULES FOR YOUR RESPONSE:
        1. Be warm, polite, and conversational.
        2. Format your response beautifully using Markdown. Use bullet points for lists, bold text for key terms.
        3. Use ONLY the provided internal document context below to answer. Do not use outside knowledge.
        4. Subtly mention which Document Title you got the answer from to build trust.
        5. If different documents say different things, politely explain the difference.
        6. If the answer is NOT in the context, politely apologize and say you couldn't find the exact information.

        INTERNAL CONTEXT:
        {context_text}

        STAFF MEMBER'S QUESTION:
        {req.message}
        """

        ai_response = llm.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(temperature=0.4)
        )

        return {
            "sender": "bot",
            "message": ai_response.text,
            "sources": sources_list
        }

    except Exception as e:
        print("AI Chat Error:", e)
        return {"sender": "bot", "message": "The AI servers are currently busy. Please try again.", "sources": []}