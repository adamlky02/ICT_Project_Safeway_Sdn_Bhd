from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

try:
    from ..general import models, database
    from ..general.auth import create_developer_mode_token, require_developer, password_matches
except ImportError:
    from general import models, database
    from general.auth import create_developer_mode_token, require_developer, password_matches

router = APIRouter(prefix="/api/developer", tags=["developer"])


# Developer Unlock Payload (requires a bounded password for a fresh credential check)
class DeveloperUnlockRequest(BaseModel):
    password: str = Field(min_length=1, max_length=500)


# Developer Mode Unlock (verifies the developer's password and issues a temporary authorization token)
@router.post("/unlock")
def unlock_developer_mode(
    req: DeveloperUnlockRequest,
    developer: models.User = Depends(require_developer),
    db: Session = Depends(database.get_db),
):
    if not password_matches(req.password, developer.password_hash):
        raise HTTPException(status_code=401, detail="The password is incorrect.")
    developer_token, expires_in = create_developer_mode_token(developer, db)
    return {"developer_token": developer_token, "expires_in": expires_in}
