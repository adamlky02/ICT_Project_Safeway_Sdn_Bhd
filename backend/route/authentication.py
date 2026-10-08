import time

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import case, func, or_
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


# MFA Verification Payload (binds a six-digit authenticator code to a pending login challenge)
class MfaVerificationRequest(BaseModel):
    mfa_token: str
    code: str = Field(pattern=r"^\d{6}$")


# Completed Login Response (returns the portal identity and a signed access token)
def _authenticated_user_response(user: models.User, response_role: str) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "role": response_role,
        "name": user.full_name,
        "access_token": auth.create_access_token(user),
    }


# Credential Verification (completes staff login or starts authenticator verification for management accounts)
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
    if not is_management_account:
        return _authenticated_user_response(user, response_role)

    # MFA Lockout (blocks pending logins until the cooldown expires and then clears failed attempts)
    now = int(time.time())
    if user.totp_lock_until and user.totp_lock_until > now:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many incorrect authenticator codes. Try again later.",
        )
    if user.totp_lock_until:
        user.totp_failed_attempts = 0
        user.totp_lock_until = None
        db.commit()

    # Initial Enrollment (stores an encrypted secret before issuing an authenticator setup challenge)
    if not user.totp_secret:
        secret, _ = auth.create_totp_setup(user)
        user.totp_secret = auth.encrypt_totp_secret(secret)
        user.totp_enabled = False
        db.commit()

    mfa_setup_required = not user.totp_enabled
    challenge = {
        "mfa_required": True,
        "mfa_setup_required": mfa_setup_required,
        "mfa_token": auth.create_mfa_token(
            user,
            setup=mfa_setup_required,
            portal_role=response_role,
        ),
    }
    # Setup Details (returns the provisioning URI and manual secret only while enrollment is incomplete)
    if mfa_setup_required:
        secret = auth.decrypt_totp_secret(user.totp_secret)
        _, provisioning_uri = auth.create_totp_setup(user, secret)
        challenge["secret"] = secret
        challenge["otpauth_url"] = provisioning_uri
    return challenge


# Authenticator Verification (completes enrollment or login after a valid, unused authenticator code)
@router.post("/login/mfa")
def verify_login_mfa(req: MfaVerificationRequest, db: Session = Depends(database.get_db)):
    user_id, scope, response_role = auth.verify_mfa_token(req.mfa_token)
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user or not user.is_active or user.role not in {"admin", "developer"}:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account is unavailable.")
    now = int(time.time())
    if user.totp_lock_until and user.totp_lock_until > now:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many incorrect authenticator codes. Try again later.",
        )
    if not user.totp_secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authenticator setup has expired. Please log in again.")

    secret = auth.decrypt_totp_secret(user.totp_secret)
    matched_counter = auth.verify_totp_code(secret, req.code)
    if matched_counter is None:
        # Failure Accounting (increments attempts in the database and locks the account after five failures)
        next_attempts = func.coalesce(models.User.totp_failed_attempts, 0) + 1
        db.query(models.User).filter(models.User.id == user.id).update(
            {
                "totp_failed_attempts": next_attempts,
                "totp_lock_until": case(
                    (next_attempts >= 5, now + 900),
                    else_=models.User.totp_lock_until,
                ),
            },
            synchronize_session=False,
        )
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication code.")

    # Challenge State (rejects setup tokens after enrollment and login tokens before enrollment)
    is_setup = scope == "mfa_setup"
    if (is_setup and user.totp_enabled) or (not is_setup and not user.totp_enabled):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication step.")

    # Code Consumption (atomically accepts only a newer counter so concurrent requests cannot reuse a code)
    update = db.query(models.User).filter(
        models.User.id == user.id,
        or_(
            models.User.totp_last_counter.is_(None),
            models.User.totp_last_counter < matched_counter,
        ),
    )
    values = {
        "totp_last_counter": matched_counter,
        "totp_failed_attempts": 0,
        "totp_lock_until": None,
    }
    if is_setup:
        values["totp_enabled"] = True
    if update.update(values, synchronize_session=False) != 1:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="This authentication code has already been used.")
    db.commit()

    return _authenticated_user_response(user, response_role)
