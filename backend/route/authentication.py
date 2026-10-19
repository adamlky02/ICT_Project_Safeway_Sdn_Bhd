import bcrypt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

try:
    from ..general import database, models
    from ..general import auth
except ImportError:
    from general import database, models
    from general import auth

router = APIRouter(prefix="/api", tags=["authentication"])


# Login Credentials (pairs account credentials with the requested staff or administrator portal)
class LoginRequest(BaseModel):
    email: str
    password: str
    role: str


# Completed Login Response (returns the portal identity and a signed access token)
def _authenticated_user_response(user: models.User, response_role: str) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "role": response_role,
        "name": user.full_name,
        "access_token": auth.create_access_token(user),
    }


# Credential Verification (completes login after checking the password, account status, and portal role)
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

    # Portal Access (checks the selected portal against the account's stored role)
    is_management_account = user.role in {"admin", "developer"}
    if req.role == "admin" and not is_management_account:
        raise HTTPException(status_code=403, detail="This portal is for administrators only")
    if req.role == "staff" and user.role not in {"staff", "admin", "developer"}:
        raise HTTPException(status_code=403, detail=f"This portal is for {req.role}s only")
    if req.role not in {"admin", "staff"}:
        raise HTTPException(status_code=400, detail="Unknown login portal")

    # Portal Identity (lets management accounts enter the staff workspace while retaining their stored role)
    response_role = "staff" if is_management_account and req.role == "staff" else user.role
    return _authenticated_user_response(user, response_role)
