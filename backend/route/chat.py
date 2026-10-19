import logging
from datetime import datetime, timedelta, timezone
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

try:
    from zoneinfo import ZoneInfo
    KUCHING_TZ = ZoneInfo("Asia/Kuching")
except Exception:
    KUCHING_TZ = timezone(timedelta(hours=8))

try:
    from ..ai.conversation import analyze_birthday_leave, build_conversation_transcript, build_retrieval_query, serialize_reasoning_context
    from ..ai.embeddings import EmbeddingError, get_embedding
    from ..ai.prompt import build_grounded_chat_prompt
    from ..ai.providers import ProviderError, ProviderTimeoutError, generate_ai_response
    from ..general import database
    from ..general.auth import get_current_user
    from ..general.models import User
    from ..general.chat_history import get_or_create_session, save_chat_turn
except ImportError:
    from ai.conversation import analyze_birthday_leave, build_conversation_transcript, build_retrieval_query, serialize_reasoning_context
    from ai.embeddings import EmbeddingError, get_embedding
    from ai.prompt import build_grounded_chat_prompt
    from ai.providers import ProviderError, ProviderTimeoutError, generate_ai_response
    from general import database
    from general.auth import get_current_user
    from general.models import User
    from general.chat_history import get_or_create_session, save_chat_turn

router = APIRouter(prefix="/api", tags=["chat"])
logger = logging.getLogger(__name__)


# Conversation Turn (accepts bounded user and assistant messages for follow-up context)
class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


# Chat Request (carries the latest question, recent conversation, and optional existing session)
class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    history: list[ChatTurn] = Field(default_factory=list, max_length=12)
    session_id: str | None = None


# Grounded Chat Response (retrieves document passages and saves the answer in the authenticated user's session)
@router.post("/chat")
# The database and provider SDKs are synchronous; FastAPI runs this handler in its thread pool.
def chat_with_ai(req: ChatRequest, db: Session = Depends(database.get_db), current_user: User = Depends(get_current_user)):
    # Resolve ownership before invoking AI; authorization errors must not be swallowed.
    session = get_or_create_session(db, str(current_user.id), req.session_id, initial_title=req.message)
    session_id = str(session.id)
    stage = "embedding"
    try:
        # Retrieval Context (combines recent turns with the question before ranking the four nearest passages)
        history = [turn.model_dump() for turn in req.history[-10:]]
        today = datetime.now(KUCHING_TZ).date()
        query_vector = get_embedding(build_retrieval_query(history, req.message), task_type=None)
        stage = "retrieval"
        results = db.execute(text('''
            SELECT c.content, k.title, k.category, k.file_path
            FROM "AI chatbot"."document_chunks" c
            JOIN "AI chatbot"."knowledge_base" k ON c.doc_id = k.id
            ORDER BY c.embedding <=> :v LIMIT 4
        '''), {"v": str(query_vector)}).fetchall()

        # Empty Knowledge Base (records a clear fallback reply when retrieval has no document passages)
        if not results:
            bot_reply = "I don't have any manuals covering this topic yet."
            if session_id:
                try:
                    save_chat_turn(db, session_id, req.message, bot_reply, [])
                except Exception as exc:
                    print("Error saving chat turn:", exc)
            return {"sender": "bot", "message": bot_reply, "sources": [], "session_id": session_id}

        # Source Evidence (keeps document labels and file paths alongside the text sent to the response model)
        stage = "prompt"
        context_parts = []
        sources_list = []
        for content, title, category, file_path in results:
            context_parts.append(f"DOCUMENT TITLE: {title} | CATEGORY: {category}\nTEXT: {content}")
            sources_list.append({"title": title, "category": category, "content": content.strip(), "file_path": file_path})

        # Grounded Prompt (combines retrieved evidence with conversation and local birthday-leave calculations)
        prompt = build_grounded_chat_prompt(
            today=today,
            conversation_text=build_conversation_transcript(history),
            birthday_reasoning_text=serialize_reasoning_context(analyze_birthday_leave(history, req.message, today)),
            context_text="\n\n---\n\n".join(context_parts),
            staff_question=req.message,
        )
        # Response Persistence (returns the generated reply even if saving the chat turn fails)
        stage = "generation"
        bot_reply = generate_ai_response(db, prompt)
        if session_id:
            try:
                save_chat_turn(db, session_id, req.message, bot_reply, sources_list)
            except Exception as exc:
                print("Error saving chat turn:", exc)
        return {"sender": "bot", "message": bot_reply, "sources": sources_list, "session_id": session_id}
    except Exception as exc:
        error_code = f"chat_{stage}_failed"
        message = {
            "embedding": "Document search is temporarily unavailable. Please contact an administrator if this continues.",
            "retrieval": "The document index could not be searched. Please contact an administrator.",
            "generation": "The AI response provider is unavailable. Please try again later.",
        }.get(stage, "The assistant could not prepare a response. Please try again later.")
        if isinstance(exc, EmbeddingError):
            error_code, message = exc.code, str(exc)
        elif isinstance(exc, ProviderTimeoutError):
            error_code = "generation_timeout"
            message = "The AI response provider took too long to respond. Please try again later."
        elif stage == "generation" and isinstance(exc, ProviderError):
            # ProviderError contains only application-authored, sanitized diagnostics.
            error_code = "generation_provider_error"
            message = str(exc) or message
            if exc.status_code in {502, 503, 504}:
                error_code = "generation_service_unavailable"
                message = (
                    f"The AI response service is temporarily unavailable (HTTP {exc.status_code}). "
                    "Please try again shortly."
                )
        elif stage == "generation" and isinstance(exc, HTTPException):
            error_code = "generation_configuration_error"
            message = "The AI response provider is not configured correctly. Please contact an administrator."

        # Never log raw database/SDK exceptions: they can contain credentials or document passages.
        safe_detail = str(exc) if isinstance(exc, (EmbeddingError, ProviderError)) else ""
        logger.error(
            "AI Chat Error: stage=%s code=%s error_type=%s status=%s detail=%s",
            stage, error_code, type(exc).__name__, getattr(exc, "status_code", None), safe_detail,
        )
        return {"sender": "bot", "message": message, "sources": [], "session_id": session_id, "error_code": error_code}
