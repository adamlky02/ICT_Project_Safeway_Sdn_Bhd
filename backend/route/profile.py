import bcrypt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

try:
    from ..general import database, models
    from ..general.auth import get_current_user
except ImportError:
    from general import database, models
    from general.auth import get_current_user

router = APIRouter(prefix="/api/profile", tags=["profile"])


class ProfileUpdate(BaseModel):
    full_name: str
    password: str | None = None


@router.get("/{uid}")
def get_profile(uid: str, current_user: models.User = Depends(get_current_user)):
    if str(current_user.id) != uid:
        raise HTTPException(status_code=403, detail="You can only view your own profile.")
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "role": current_user.role,
        "full_name": current_user.full_name,
    }


@router.put("/{uid}")
def update_profile(
    uid: str,
    req: ProfileUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    if str(current_user.id) != uid:
        raise HTTPException(status_code=403, detail="You can only update your own profile.")

    current_user.full_name = req.full_name
    if req.password and req.password.strip():
        current_user.password_hash = bcrypt.hashpw(
            req.password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")
    db.commit()

    return {
        "message": "Profile updated successfully",
        "id": str(current_user.id),
        "email": current_user.email,
        "role": current_user.role,
        "full_name": current_user.full_name,
    }
