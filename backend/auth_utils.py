import base64
import binascii
import hashlib
import hmac
import json
import os
import secrets
import time
import warnings

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

import database
import models


# Authentication Secret (uses the deployment secret and falls back to an ephemeral development key)
_configured_secret = os.getenv("SECRET_KEY", "").strip()
if not _configured_secret:
    warnings.warn(
        "SECRET_KEY is not configured. Login tokens will be invalidated whenever the backend restarts.",
        RuntimeWarning,
    )
elif len(_configured_secret) < 32:
    warnings.warn("SECRET_KEY should contain at least 32 characters.", RuntimeWarning)
_AUTH_SECRET = (_configured_secret or secrets.token_urlsafe(48)).encode("utf-8")
_TOKEN_TTL_SECONDS = int(os.getenv("ACCESS_TOKEN_TTL_SECONDS", "43200"))
_DEVELOPER_MODE_TTL_SECONDS = int(os.getenv("DEVELOPER_MODE_TTL_SECONDS", "900"))
_bearer_scheme = HTTPBearer(auto_error=False)


def _encode_segment(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


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
    except (ValueError, TypeError, KeyError, json.JSONDecodeError, binascii.Error, UnicodeDecodeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=invalid_detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


# Access Token Creation (signs identity, role, and expiration without storing a server session)
def create_access_token(user: models.User) -> str:
    return _create_signed_token({
        "sub": str(user.id),
        "role": user.role,
        "scope": "access",
        "exp": int(time.time()) + _TOKEN_TTL_SECONDS,
    })


# Developer Mode Token Creation (issues a short-lived second-factor-by-password authorization)
def create_developer_mode_token(user: models.User) -> tuple[str, int]:
    token = _create_signed_token({
        "sub": str(user.id),
        "scope": "developer_mode",
        "exp": int(time.time()) + _DEVELOPER_MODE_TTL_SECONDS,
    })
    return token, _DEVELOPER_MODE_TTL_SECONDS


# Current User Dependency (resolves a valid token to an active database account)
def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: Session = Depends(database.get_db),
) -> models.User:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = _verify_signed_token(
        credentials.credentials,
        "Your session is invalid or has expired. Please log in again.",
    )
    if payload.get("scope") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token.")
    user = db.query(models.User).filter(models.User.id == payload["sub"]).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account is unavailable.")
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
def verify_developer_mode_token(token: str | None, current_user: models.User) -> models.User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unlock Developer Mode with your password to continue.",
        )
    payload = _verify_signed_token(token, "Developer Mode has expired. Enter your password again.")
    if payload.get("scope") != "developer_mode" or payload.get("sub") != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid Developer Mode authorization.")
    return current_user


# Developer Mode Dependency (requires both the developer role and a recent password confirmation)
def require_developer_mode(
    current_user: models.User = Depends(require_developer),
    developer_token: str | None = Header(default=None, alias="X-Developer-Token"),
) -> models.User:
    return verify_developer_mode_token(developer_token, current_user)
