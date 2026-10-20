import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

try:
    from ..general import database, models, mfa
    from ..general.auth import get_current_user
except ImportError:
    from general import database, models, mfa
    from general.auth import get_current_user

router = APIRouter(prefix="/api/profile", tags=["profile"])


# Profile Update Payload (allows a name change and an optional replacement password)
class ProfileUpdate(BaseModel):
    full_name: str
    password: str | None = None
    current_password: str | None = None
    mfa_code: str = ""


# Own Profile Read (requires the requested user ID to match the authenticated account)
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


# Own Profile Update (saves the authenticated user's name and hashes any nonblank replacement password)
@router.put("/{uid}")
def update_profile(
    uid: str,
    req: ProfileUpdate,
    request: Request,
    response: Response,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    if str(current_user.id) != uid:
        raise HTTPException(status_code=403, detail="You can only update your own profile.")

    if req.password and req.password.strip():
        if not req.current_password:
            raise HTTPException(400, "Confirm your current password before changing it.")
        state = mfa.confirm_password(db, request, current_user, req.current_password, code=req.mfa_code, require_factor=True)
        mfa.revoke_sessions(db, state)
        mfa.cancel_requests(db, current_user, "Account credentials changed; submit a fresh request if needed.")
        mfa.audit(db, "password_changed", current_user)
        token = mfa.issue_session(db, current_user, state, portal_role=request.state.auth_portal_role, mfa_verified=state.enabled)
        mfa.set_cookie(response, token)
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
