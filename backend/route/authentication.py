import bcrypt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

try:
    from ..general import database, models
    from ..general.auth import create_access_token
except ImportError:
    from general import database, models
    from general.auth import create_access_token

router = APIRouter(prefix="/api", tags=["authentication"])


class LoginRequest(BaseModel):
    email: str
    password: str
    role: str


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if (
        not user
        or not user.is_active
        or not bcrypt.checkpw(
            req.password.encode("utf-8"), user.password_hash.encode("utf-8")
        )
    ):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    is_management_account = user.role in {"admin", "developer"}
    if req.role == "admin" and not is_management_account:
        raise HTTPException(status_code=403, detail="This portal is for administrators only")
    if req.role == "staff" and user.role not in {"staff", "admin", "developer"}:
        raise HTTPException(status_code=403, detail=f"This portal is for {req.role}s only")
    if req.role not in {"admin", "staff"}:
        raise HTTPException(status_code=400, detail="Unknown login portal")

    response_role = "staff" if is_management_account and req.role == "staff" else user.role
    return {
        "id": str(user.id),
        "email": user.email,
        "role": response_role,
        "name": user.full_name,
        "access_token": create_access_token(user),
    }
