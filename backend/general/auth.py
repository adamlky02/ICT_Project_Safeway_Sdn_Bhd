import base64
import binascii
import hashlib
import hmac
import json
import os
import secrets
import time
import warnings
import bcrypt

from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from . import database, models, mfa


# Developer Unlock Signing (uses the deployment secret with an ephemeral fallback only for development)
_configured_secret = os.getenv("SECRET_KEY", "").strip()
if not _configured_secret:
    warnings.warn(
        "SECRET_KEY is not configured. Developer Mode unlocks will be invalidated whenever the backend restarts.",
        RuntimeWarning,
    )
elif len(_configured_secret) < 32:
    warnings.warn("SECRET_KEY should contain at least 32 characters.", RuntimeWarning)
_AUTH_SECRET = (_configured_secret or secrets.token_urlsafe(48)).encode("utf-8")
_DEVELOPER_MODE_TTL_SECONDS = int(os.getenv("DEVELOPER_MODE_TTL_SECONDS", "900"))
_bearer_scheme = HTTPBearer(auto_error=False)


# Token Segment Encoding (creates compact URL-safe Base64 without trailing padding)
def _encode_segment(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


# Token Segment Decoding (restores Base64 padding before reading the signed payload or signature)
def _decode_segment(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding}")


# Signed Token Creation (protects compact session payloads against tampering)
def _create_signed_token(payload: dict) -> str:
    encoded_payload = _encode_segment(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = hmac.new(_AUTH_SECRET, encoded_payload.encode("ascii"), hashlib.sha256).digest()
    return f"{encoded_payload}.{_encode_segment(signature)}"


# Signed Token Verification (rejects malformed, expired, or tampered token payloads)
def _verify_signed_token(token: str, invalid_detail: str) -> dict:
    try:
        encoded_payload, encoded_signature = token.split(".", 1)
        supplied_signature = _decode_segment(encoded_signature)
        expected_signature = hmac.new(_AUTH_SECRET, encoded_payload.encode("ascii"), hashlib.sha256).digest()
        if not hmac.compare_digest(supplied_signature, expected_signature):
            raise ValueError("Invalid signature")

        payload = json.loads(_decode_segment(encoded_payload))
        if not isinstance(payload, dict) or int(payload.get("exp", 0)) <= int(time.time()):
            raise ValueError("Expired token")
        if not payload.get("sub") or not payload.get("scope"):
            raise ValueError("Incomplete token")
        return payload
    except (ValueError, TypeError, KeyError, json.JSONDecodeError, binascii.Error, UnicodeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=invalid_detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


# Password Verification (malformed or overlong bcrypt input fails authentication instead of producing a server error).
def password_matches(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


# Access Session Creation (returns a revocable opaque bearer token for API clients and authentication tests).
def create_access_token(user: models.User, db: Session) -> str:
    state = mfa.state_for(db, user)
    if state.enabled or state.requires_enrollment:
        raise HTTPException(401, "Complete MFA before creating an access session.")
    token = mfa.issue_session(db, user, state)
    db.commit()
    return token


# Developer Mode Token Creation (issues a short-lived authorization after password confirmation)
def create_developer_mode_token(user: models.User, db: Session) -> tuple[str, int]:
    token = _create_signed_token({
        "sub": str(user.id),
        "scope": "developer_mode",
        "generation": mfa.state_for(db, user).generation,
        "credential": hashlib.sha256(user.password_hash.encode()).hexdigest(),
        "exp": int(time.time()) + _DEVELOPER_MODE_TTL_SECONDS,
    })
    return token, _DEVELOPER_MODE_TTL_SECONDS


# Deployment Validation (requires stable signing configuration for online logins)
def validate_auth_configuration() -> None:
    is_production = os.getenv("APP_ENV", "").strip().lower() == "production" or os.getenv("RENDER", "").lower() == "true"
    if is_production and len(_configured_secret) < 32:
        raise RuntimeError("Online deployment requires a stable SECRET_KEY of at least 32 characters for Developer Mode and configured AI-key encryption.")


# Current User Dependency (validates server-side scope, enrollment generation, and current account status).
def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: Session = Depends(database.get_db),
) -> models.User:
    token = credentials.credentials if credentials and credentials.scheme.lower() == "bearer" else request.cookies.get("safeway_session")
    if not token:
        raise HTTPException(401, "Authentication is required.", headers={"WWW-Authenticate": "Bearer", "X-Session-Expired": "1"})
    # Cookie CSRF Protection (mutations require a custom header and an explicitly allowed browser origin).
    if not credentials and request.method not in {"GET", "HEAD", "OPTIONS"}:
        origins = {value.strip() for value in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",") if value.strip()}
        origins.add(str(request.base_url).rstrip("/"))
        if request.headers.get("X-Safeway-Request") != "1" or request.headers.get("Origin") not in origins:
            raise HTTPException(403, "This browser request is not allowed.")
    try:
        session, user, state = mfa.resolve_session(db, token, {"access"})
    except HTTPException as exc:
        if exc.status_code == 401:
            raise HTTPException(401, exc.detail, headers={"X-Session-Expired": "1"}) from None
        raise
    if state.requires_enrollment or (state.enabled and not session.mfa_verified):
        raise HTTPException(401, "Complete authenticator verification before continuing.", headers={"X-Session-Expired": "1"})
    request.state.auth_generation = state.generation
    request.state.auth_portal_role = session.portal_role
    request.state.auth_session_hash = session.token_hash
    return user


# Administrator Dependency (allows administrators and developers into management routes)
def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if current_user.role not in {"admin", "developer"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator access is required.")
    return current_user


# Developer Dependency (limits developer-mode entry to accounts holding the developer role)
def require_developer(current_user: models.User = Depends(get_current_user)) -> models.User:
    if current_user.role != "developer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Developer access is required.")
    return current_user


# Developer Mode Verification (binds a recent password unlock to the current developer account)
def verify_developer_mode_token(token: str | None, current_user: models.User, db: Session) -> models.User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unlock Developer Mode with your password to continue.",
        )
    payload = _verify_signed_token(token, "Developer Mode has expired. Enter your password again.")
    if (payload.get("scope") != "developer_mode" or payload.get("sub") != str(current_user.id)
        or payload.get("generation") != mfa.state_for(db, current_user).generation
        or payload.get("credential") != hashlib.sha256(current_user.password_hash.encode()).hexdigest()):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid Developer Mode authorization.")
    return current_user


# Developer Mode Dependency (requires both the developer role and a recent password confirmation)
def require_developer_mode(
    current_user: models.User = Depends(require_developer),
    developer_token: str | None = Header(default=None, alias="X-Developer-Token"),
    db: Session = Depends(database.get_db),
) -> models.User:
    return verify_developer_mode_token(developer_token, current_user, db)
