from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

try:
    from ..ai.providers import get_active_provider_name
    from ..general import database, models
    from ..general.auth import require_admin
except ImportError:
    from ai.providers import get_active_provider_name
    from general import database, models
    from general.auth import require_admin

router = APIRouter(prefix="/api/admin", tags=["admin analytics"])


@router.get("/analytics")
def get_analytics(
    db: Session = Depends(database.get_db),
    _admin: models.User = Depends(require_admin),
):
    total_size_bytes = db.query(func.sum(models.KnowledgeBase.file_size)).scalar() or 0
    return {
        "total_users": db.query(models.User).count(),
        "total_docs": db.query(models.KnowledgeBase).count(),
        "total_storage_mb": round(total_size_bytes / (1024 * 1024), 2),
        "status": {
            "database": "operational",
            "storage": "operational",
            "ai": "operational",
            "ai_provider": get_active_provider_name(db),
        },
    }
