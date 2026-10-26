from .ai_settings import router as ai_settings_router
from .analytics import router as analytics_router
from .chat import router as chat_router
from .documents import router as documents_router

try:
    from ..general.chat_history import chat_history_router
    from ..login.routes import authentication_router, developer_router, mfa_router, profile_router, users_router
except ImportError:
    from general.chat_history import chat_history_router
    from login.routes import authentication_router, developer_router, mfa_router, profile_router, users_router


routers = (
    chat_history_router,
    authentication_router,
    mfa_router,
    profile_router,
    developer_router,
    analytics_router,
    ai_settings_router,
    users_router,
    documents_router,
    chat_router,
)
