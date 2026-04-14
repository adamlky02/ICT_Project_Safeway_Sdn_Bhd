from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
import bcrypt
from datetime import datetime, timedelta
from jose import jwt
from typing import Optional

# Import your local database and model files
import database
import models

# --- CONFIGURATION ---
SECRET_KEY = "safeway_internal_secret_key_change_this_later"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440 # 24 hours

app = FastAPI(title="Safeway AI Chatbot API")

# Allow both 5173 and 5174 in case one is busy
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- PYDANTIC SCHEMAS (For Request Validation) ---
class LoginRequest(BaseModel):
    email: str
    password: str
    role: str

class ChatRequest(BaseModel):
    message: str

# --- AUTH UTILS ---
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# --- ROUTES ---

@app.get("/")
def home():
    return {
        "status": "Safeway API is online",
        "database": "Connected to Neon DB",
        "docs": "/docs"
    }

@app.post("/api/login")
def login(req: LoginRequest, db: Session = Depends(database.get_db)):
    # 1. Look for the user in your Neon "User_list" table
    user = db.query(models.User).filter(models.User.email == req.email).first()

    # 2. Check if user exists and role matches
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    if user.role != req.role:
        raise HTTPException(status_code=403, detail=f"Access denied: This portal is for {req.role} only")

    # 3. Verify the Bcrypt password
    if not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect password")

    # 4. Generate JWT Token
    token = create_access_token(data={"sub": user.email, "role": user.role})

    return {
        "token": token,
        "role": user.role,
        "email": user.email,
        "message": "Login successful"
    }

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    # This is a placeholder for your future RAG/AI logic
    user_input = req.message.lower()

    # Mock response for prototype
    if "leave" in user_input:
        response = "According to the Safeway Handbook, employees are entitled to 14 days of leave."
    elif "safety" in user_input:
        response = "Safety manuals require all staff to wear PPE in the warehouse."
    else:
        response = "I have received your query. Once AI integration is complete, I will search the internal manuals for a specific answer."

    return {"sender": "bot", "message": response}

# --- DOCUMENT MANAGEMENT (For Admin) ---
@app.get("/api/admin/stats")
def get_stats(db: Session = Depends(database.get_db)):
    # Just a mock for now to show on the Admin Dashboard
    user_count = db.query(models.User).count()
    return {
        "total_users": user_count,
        "documents_indexed": 12,
        "system_status": "Healthy"
    }
