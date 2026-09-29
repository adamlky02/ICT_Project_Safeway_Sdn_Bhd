import secrets
import string
import bcrypt
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

try:
    from ..general import database, models
    from ..general.auth import require_admin, verify_developer_mode_token
    from ..general.email import send_staff_credentials_email
except ImportError:
    from general import database, models
    from general.auth import require_admin, verify_developer_mode_token
    from general.email import send_staff_credentials_email

router = APIRouter(prefix="/api/admin/users", tags=["user administration"])
STAFF_EMAIL_DOMAIN = "gmail.com"


class StaffCreate(BaseModel):
    username: str
    full_name: str


class StaffUpdate(BaseModel):
    username: str
    password: str | None = None
    full_name: str
    role: str | None = None


def _normalize_username(username: str) -> str:
    clean = username.strip().lower()
    for domain in (STAFF_EMAIL_DOMAIN, "safeway.com"):
        suffix = f"@{domain}"
        if clean.endswith(suffix):
            return clean[:-len(suffix)]
    return clean


def _generate_random_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*_-=+"
    return "".join(secrets.choice(alphabet) for _ in range(length))


@router.get("")
def get_users(db: Session = Depends(database.get_db), _admin: models.User = Depends(require_admin)):
    return [{
        "id": str(user.id), "email": user.email, "full_name": user.full_name,
        "role": user.role, "is_active": user.is_active, "created_at": user.created_at,
    } for user in db.query(models.User).all()]


@router.post("")
def create_staff(req: StaffCreate, db: Session = Depends(database.get_db), _admin: models.User = Depends(require_admin)):
    email = f"{_normalize_username(req.username)}@{STAFF_EMAIL_DOMAIN}"
    if db.query(models.User).filter(models.User.email == email).first():
        raise HTTPException(status_code=400, detail="Username already exists")

    generated_password = _generate_random_password()
    hashed = bcrypt.hashpw(generated_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    db.add(models.User(email=email, password_hash=hashed, full_name=req.full_name, role="staff"))
    db.commit()
    send_staff_credentials_email(email, generated_password)
    return {"message": "Success", "password": generated_password, "email": email}


@router.put("/{uid}")
def update_staff(
    uid: str,
    req: StaffUpdate,
    db: Session = Depends(database.get_db),
    admin: models.User = Depends(require_admin),
    developer_token: str | None = Header(default=None, alias="X-Developer-Token"),
):
    user = db.query(models.User).filter(models.User.id == uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    requested_role = req.role or user.role
    if user.role == "developer" or requested_role == "developer":
        if admin.role != "developer":
            raise HTTPException(status_code=403, detail="Only a developer can manage developer accounts.")
        verify_developer_mode_token(developer_token, admin)
        if requested_role == "developer" and user.role not in {"admin", "developer"}:
            raise HTTPException(status_code=400, detail="Promote this account to administrator before granting developer access.")
        if str(user.id) == str(admin.id) and requested_role != user.role:
            raise HTTPException(status_code=400, detail="You cannot change your own developer role.")
        if user.role == "developer" and requested_role != "developer":
            count = db.query(models.User).filter(models.User.role == "developer").count()
            if count <= 1:
                raise HTTPException(status_code=400, detail="The system must keep at least one developer account.")

    user.email = f"{_normalize_username(req.username)}@{STAFF_EMAIL_DOMAIN}"
    user.full_name = req.full_name
    if req.password and req.password.strip():
        user.password_hash = bcrypt.hashpw(req.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    if req.role in {"staff", "admin", "developer"}:
        user.role = req.role
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Staff email already exists")
    return {"message": "Updated"}


@router.delete("/{uid}")
def delete_user(uid: str, db: Session = Depends(database.get_db), admin: models.User = Depends(require_admin)):
    user = db.query(models.User).filter(models.User.id == uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if str(user.id) == str(admin.id):
        raise HTTPException(status_code=400, detail="You cannot delete your own account.")
    if user.role == "developer":
        raise HTTPException(status_code=403, detail="Remove developer access before deleting this account.")
    db.delete(user)
    db.commit()
    return {"message": "Deleted"}
