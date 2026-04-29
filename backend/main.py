import os
import shutil
import bcrypt
from uuid import uuid4
from typing import List
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel

import database, models
from email_utils import send_staff_credentials_email

app = FastAPI()

# Enable CORS for React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure the uploads directory exists
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

def _normalize_username(username: str) -> str:
    clean = username.strip().lower()
    if clean.endswith("@safeway.com"):
        clean = clean[:-12]
    return clean

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

# --- Admin: Staff Management ---
@app.get("/api/admin/users")
def get_users(db: Session = Depends(database.get_db)):
    return db.query(models.User).all()

# 2. Update the create_staff route (Add default password)
@app.post("/api/admin/users")
def create_staff(req: StaffCreate, db: Session = Depends(database.get_db)):
    email = f"{req.username}@safeway.com"

    # Check if user already exists
    if db.query(models.User).filter(models.User.email == email).first():
        raise HTTPException(status_code=400, detail="Username already exists")

    # Set a DEFAULT password for all new staff
    default_password = "staff123"
    hashed = bcrypt.hashpw(default_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    new_user = models.User(email=email, password_hash=hashed, full_name=req.full_name, role="staff")
    db.add(new_user)
    db.commit()
    return {"message": "Success"}

@app.put("/api/admin/users/{uid}")
def update_staff(uid: str, req: StaffUpdate, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.id == uid, models.User.role == "staff").first()
    if not user:
        raise HTTPException(status_code=404, detail="Staff user not found")

    username = _normalize_username(req.username)
    user.email = f"{username}@safeway.com"
    user.full_name = req.full_name

    # Keep the existing password when the edit form leaves it blank.
    if req.password and req.password.strip():
        user.password_hash = bcrypt.hashpw(req.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

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

# --- Admin: Knowledge Base Management (FILE UPLOADS) ---

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
    if extension not in ["pdf", "docx", "doc", "txt"]:
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF or Word.")

    # 2. Create Unique Filename
    unique_filename = f"{uuid4()}.{extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # 3. Save File to local disk
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error saving file.")

    # 4. Save Record to Database
    try:
        new_doc = models.KnowledgeBase(
            title=title,
            category=category,
            file_path=file_path,      # <--- 'content' was here, now it's gone!
            file_type=extension,
            file_size=file.size,
            uploaded_by=admin_id
        )
        db.add(new_doc)
        db.commit()
        return {"message": "Document uploaded successfully"}
    except Exception as e:
        db.rollback()
        if os.path.exists(file_path):
            os.remove(file_path) # Clean up file if DB fails
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/admin/documents/{did}")
def delete_doc(did: int, db: Session = Depends(database.get_db)):
    # Find doc to get file path
    doc = db.query(models.KnowledgeBase).filter(models.KnowledgeBase.id == did).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete physical file
    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)

    # Delete DB record
    db.delete(doc)
    db.commit()
    return {"message": "Document and physical file deleted"}