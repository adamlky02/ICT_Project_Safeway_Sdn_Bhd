import bcrypt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

try:
    from ..general import models
    from ..general.auth import create_developer_mode_token, require_developer
except ImportError:
    from general import models
    from general.auth import create_developer_mode_token, require_developer

router = APIRouter(prefix="/api/developer", tags=["developer"])


class DeveloperUnlockRequest(BaseModel):
    password: str = Field(min_length=1, max_length=500)


@router.post("/unlock")
def unlock_developer_mode(
    req: DeveloperUnlockRequest,
    developer: models.User = Depends(require_developer),
):
    if not bcrypt.checkpw(req.password.encode("utf-8"), developer.password_hash.encode("utf-8")):
        raise HTTPException(status_code=401, detail="The password is incorrect.")
    developer_token, expires_in = create_developer_mode_token(developer)
    return {"developer_token": developer_token, "expires_in": expires_in}
