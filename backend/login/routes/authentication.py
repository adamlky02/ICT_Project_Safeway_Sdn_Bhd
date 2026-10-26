import bcrypt
from sqlalchemy import delete
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

try:
    from ...general import database, models
    from .. import auth, mfa
except ImportError:
    from general import database, models
    from login import auth, mfa

router = APIRouter(prefix="/api", tags=["authentication"])


# Login Credentials (pairs account credentials with the requested staff or administrator portal)
class LoginRequest(BaseModel):
    email: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=500)
    role: str


# Credential Verification (completes login after checking the password, account status, and portal role)
@router.post("/login")
def login(req: LoginRequest, request: Request, response: Response, db: Session = Depends(database.get_db)):
    mfa.throttle(db, request, "login", req.email.strip().lower())
    response.headers["Cache-Control"] = "no-store"
    user = db.query(models.User).filter(models.User.email == req.email.strip().lower()).first()
    if (
        not user
        or not user.is_active
        or not auth.password_matches(req.password, user.password_hash)
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
    verified_hash, verified_role = user.password_hash, user.role
    state = mfa.state_for(db, user, lock=True)
    db.refresh(user)
    # Concurrent Credential Changes (a password checked before a reset must not create a new-generation session afterward).
    if not user.is_active or user.password_hash != verified_hash or user.role != verified_role:
        raise HTTPException(401, "Account credentials changed. Please sign in again.")
    if state.requires_enrollment:
        return mfa.begin_setup(db, user, state, response_role)
    if state.enabled:
        token = mfa.issue_session(db, user, state, "mfa_login", response_role)
        record = mfa.request_data(mfa.latest_request(db, user.id))
        db.commit()
        return {"mfa_required": True, "setup_required": False, "challenge_token": token,
                "expires_in": mfa.CHALLENGE_TTL, "reset_request": record}
    return mfa.login_response(db, response, user, response_role, state)


# Server Logout (revokes the current token and expires the browser cookie).
@router.post("/logout")
def logout(request: Request, response: Response, user=Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    db.execute(delete(models.AuthSession).where(models.AuthSession.token_hash == request.state.auth_session_hash))
    db.commit()
    response.delete_cookie("safeway_session", path="/")
    response.headers["Cache-Control"] = "no-store"
    return {"message": "Signed out"}
