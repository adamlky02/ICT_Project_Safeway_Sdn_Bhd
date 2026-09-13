from typing import Literal
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

try:
    from ..ai.providers import activate_ai_draft, get_ai_settings, rollback_ai_provider, save_ai_draft, test_ai_draft
    from ..general import database, models
    from ..general.auth import require_developer_mode
except ImportError:
    from ai.providers import activate_ai_draft, get_ai_settings, rollback_ai_provider, save_ai_draft, test_ai_draft
    from general import database, models
    from general.auth import require_developer_mode

router = APIRouter(prefix="/api/admin/ai-settings", tags=["AI settings"])


class AIProviderDraftRequest(BaseModel):
    display_name: str = Field(min_length=1, max_length=100)
    provider: Literal["gemini", "openai_compatible"]
    base_url: str = Field(min_length=8, max_length=500)
    model: str = Field(min_length=1, max_length=200)
    api_key: str | None = Field(default=None, max_length=1000)
    temperature: float = Field(default=0.4, ge=0, le=2)
    max_tokens: int = Field(default=1024, ge=32, le=32768)
    timeout_seconds: int = Field(default=45, ge=5, le=120)
    thinking_mode: Literal["enabled", "disabled"] = "disabled"


@router.get("")
def read_ai_settings(db: Session = Depends(database.get_db), _developer: models.User = Depends(require_developer_mode)):
    return get_ai_settings(db)


@router.put("/draft")
def update_ai_settings_draft(req: AIProviderDraftRequest, db: Session = Depends(database.get_db), admin: models.User = Depends(require_developer_mode)):
    return save_ai_draft(db, req.model_dump(), str(admin.id))


@router.post("/test")
def test_ai_settings_connection(db: Session = Depends(database.get_db), _developer: models.User = Depends(require_developer_mode)):
    return test_ai_draft(db)


@router.post("/activate")
def activate_ai_settings(db: Session = Depends(database.get_db), admin: models.User = Depends(require_developer_mode)):
    return activate_ai_draft(db, str(admin.id))


@router.post("/rollback")
def rollback_ai_settings(db: Session = Depends(database.get_db), admin: models.User = Depends(require_developer_mode)):
    return rollback_ai_provider(db, str(admin.id))
