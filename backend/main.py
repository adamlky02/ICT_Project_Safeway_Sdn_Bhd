from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# Enable React to talk to Python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # Vite default port
    allow_methods=["*"],
    allow_headers=["*"],
)

class LoginRequest(BaseModel):
    email: str
    password: str
    role: str

@app.post("/api/login")
async def login(req: LoginRequest):
    # HARDCODED LOGIC FOR PROTOTYPE
    if req.role == "admin":
        if req.email == "admin@safeway.com" and req.password == "admin123":
            return {"token": "fake-jwt-admin", "role": "admin"}
    else:
        if req.email == "staff@safeway.com" and req.password == "staff123":
            return {"token": "fake-jwt-staff", "role": "staff"}

    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.get("/")
def root():
    return {"message": "Safeway API Running"}