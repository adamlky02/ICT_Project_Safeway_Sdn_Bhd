import logging
import json
import time
from datetime import datetime, timedelta, timezone
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy.exc import DBAPIError

try:
    from zoneinfo import ZoneInfo
    KUCHING_TZ = ZoneInfo("Asia/Kuching")
except Exception:
    KUCHING_TZ = timezone(timedelta(hours=8))

try:
    from ..ai.conversation import analyze_birthday_leave, build_conversation_transcript, build_retrieval_query, serialize_reasoning_context
    from ..ai.embeddings import EmbeddingError, get_embedding
    from ..ai.prompt import PROMPT_VERSION, build_grounded_chat_prompt, parse_grounded_answer
    from ..ai.retrieval import retrieve_passages
    from ..ai.language import question_language
    from ..ai.providers import ProviderError, ProviderTimeoutError, generate_ai_response
    from ..general import database
    from ..login.auth import get_current_user
    from ..general.models import User
    from ..general.chat_history import get_or_create_session, save_chat_turn
except ImportError:
    from ai.conversation import analyze_birthday_leave, build_conversation_transcript, build_retrieval_query, serialize_reasoning_context
    from ai.embeddings import EmbeddingError, get_embedding
    from ai.prompt import PROMPT_VERSION, build_grounded_chat_prompt, parse_grounded_answer
    from ai.retrieval import retrieve_passages
    from ai.language import question_language
    from ai.providers import ProviderError, ProviderTimeoutError, generate_ai_response
    from general import database
    from login.auth import get_current_user
    from general.models import User
    from general.chat_history import get_or_create_session, save_chat_turn

router = APIRouter(prefix="/api", tags=["chat"])
logger = logging.getLogger(__name__)


def no_evidence_reply(message: str) -> str:
    language = question_language(message)
    if language == "zh":
        return "未找到足以回答此问题的相关资料。政策问题请向人力资源部门确认；产品问题请查阅产品资料或联系产品管理员。"
    if language == "ms":
        return "Maklumat berkaitan yang mencukupi tidak ditemukan. Untuk polisi, sila rujuk HR; untuk produk, semak helaian data atau hubungi pentadbir produk."
    return "I couldn't find enough relevant evidence to answer this question. For policies, please check with HR; for products, check the datasheet or ask the product administrator."


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
def chat_with_ai(req: ChatRequest, db: Session = Depends(database.get_db), current_user: User = Depends(get_current_user), response: Response = None):
    # Resolve ownership before invoking AI; authorization errors must not be swallowed.
    session = get_or_create_session(db, str(current_user.id), req.session_id, initial_title=req.message)
    session_id = str(session.id)
    started = time.monotonic()
    stage = "embedding"
    try:
        # Hybrid retrieval keeps generation separate from evidence selection.
        history = [turn.model_dump() for turn in req.history[-10:]]
        today = datetime.now(KUCHING_TZ).date()
        retrieval_query = build_retrieval_query(history, req.message)
        query_vector = get_embedding(retrieval_query, task_type=None)
        stage = "retrieval"
        results = retrieve_passages(db, query_vector, retrieval_query)

        # Empty Knowledge Base (records a clear fallback reply when retrieval has no document passages)
        if not results:
            bot_reply = no_evidence_reply(req.message)
            if session_id:
                try:
                    save_chat_turn(db, session_id, req.message, bot_reply, [])
                except Exception:
                    db.rollback()
                    logger.warning("Chat persistence failed after no-evidence response")
            return {"sender": "bot", "message": bot_reply, "sources": [], "session_id": session_id, "answer_status": "insufficient_evidence"}

        # Source Evidence (keeps document labels and file paths alongside the text sent to the response model)
        stage = "prompt"
        context_parts = []
        sources_list = []
        for index, passage in enumerate(results, start=1):
            source_id = f"S{index}"
            context_parts.append({"source_id": source_id, "title": passage.title, "category": passage.category, "text": passage.content})
            sources_list.append({"source_id": source_id, "title": passage.title, "category": passage.category, "content": passage.content.strip(), "file_path": passage.file_path})

        # Grounded Prompt (combines retrieved evidence with conversation and local birthday-leave calculations)
        prompt = build_grounded_chat_prompt(
            today=today,
            conversation_text=build_conversation_transcript(history),
            birthday_reasoning_text=serialize_reasoning_context(analyze_birthday_leave(history, req.message, today)),
            context_text=json.dumps(context_parts, ensure_ascii=False),
            staff_question=req.message,
            source_ids=tuple(source["source_id"] for source in sources_list),
        )
        # Response Persistence (returns the generated reply even if saving the chat turn fails)
        stage = "generation"
        raw_reply = generate_ai_response(db, prompt)
        answer = parse_grounded_answer(raw_reply, prompt.source_ids)
        bot_reply = answer.answer
        sources_list = [source for source in sources_list if source["source_id"] in answer.source_ids]
        if session_id:
            try:
                save_chat_turn(db, session_id, req.message, bot_reply, sources_list)
            except Exception:
                db.rollback()
                logger.warning("Chat persistence failed after grounded response")
        logger.info("AI chat prompt_version=%s passages=%s cited=%s status=%s latency_ms=%s",
                    PROMPT_VERSION, len(results), len(sources_list), answer.status, round((time.monotonic() - started) * 1000))
        return {"sender": "bot", "message": bot_reply, "sources": sources_list, "session_id": session_id, "answer_status": answer.status}
    except Exception as exc:
        db.rollback()
        error_code = f"chat_{stage}_failed"
        http_status = 500
        sqlstate = None
        if isinstance(exc, DBAPIError):
            sqlstate = getattr(exc.orig, "sqlstate", None) or getattr(exc.orig, "pgcode", None)
            # SQLSTATE contains no query text, bound values, document content or credentials.
            if not isinstance(sqlstate, str) or len(sqlstate) != 5 or not sqlstate.isalnum():
                sqlstate = None
        message = {
            "embedding": "Document search is temporarily unavailable. Please contact an administrator if this continues.",
            "retrieval": "The document index could not be searched. Please contact an administrator.",
            "generation": "The AI response provider is unavailable. Please try again later.",
        }.get(stage, "The assistant could not prepare a response. Please try again later.")
        if isinstance(exc, EmbeddingError):
            error_code, message = exc.code, str(exc)
            http_status = 503
        elif stage == "retrieval" and sqlstate in {"42703", "42P01"}:
            error_code = "retrieval_schema_mismatch"
            message = "Document search requires a database update. Please contact an administrator."
            http_status = 503
        elif isinstance(exc, ProviderTimeoutError):
            error_code = "generation_timeout"
            message = "The AI response provider took too long to respond. Please try again later."
            http_status = 504
        elif stage == "generation" and isinstance(exc, ProviderError):
            # ProviderError contains only application-authored, sanitized diagnostics.
            error_code = "generation_provider_error"
            message = str(exc) or message
            http_status = 502
            if exc.status_code in {502, 503, 504}:
                error_code = "generation_service_unavailable"
                http_status = 503
                message = (
                    f"The AI response service is temporarily unavailable (HTTP {exc.status_code}). "
                    "Please try again shortly."
                )
        elif stage == "generation" and isinstance(exc, HTTPException):
            error_code = "generation_configuration_error"
            message = "The AI response provider is not configured correctly. Please contact an administrator."
            http_status = 503

        # Never log raw database/SDK exceptions: they can contain credentials or document passages.
        safe_detail = str(exc) if isinstance(exc, (EmbeddingError, ProviderError)) else ""
        if error_code == "retrieval_schema_mismatch":
            safe_detail = "Apply backend/migrations/20261109_ai_retrieval_v2.sql and reindex documents before serving chat."
        logger.error(
            "AI Chat Error: stage=%s code=%s error_type=%s status=%s sqlstate=%s detail=%s",
            stage, error_code, type(exc).__name__, getattr(exc, "status_code", None), sqlstate, safe_detail,
        )
        if response is not None:
            response.status_code = http_status
        return {"sender": "bot", "message": message, "sources": [], "session_id": session_id, "error_code": error_code}
