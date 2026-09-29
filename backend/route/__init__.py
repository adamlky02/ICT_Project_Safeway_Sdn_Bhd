from .ai_settings import router as ai_settings_router
from .analytics import router as analytics_router
from .authentication import router as authentication_router
from .chat import router as chat_router
from .developer import router as developer_router
from .documents import router as documents_router
from .profile import router as profile_router
from .users import router as users_router

try:
    from ..general.chat_history import chat_history_router
except ImportError:
    from general.chat_history import chat_history_router


routers = (
    chat_history_router,
    authentication_router,
    profile_router,
    developer_router,
    analytics_router,
    ai_settings_router,
    users_router,
    documents_router,
    chat_router,
)
