from datetime import datetime, timedelta, timezone
from typing import Literal
from fastapi import APIRouter, Depends
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
    from ..ai.embeddings import get_embedding
    from ..ai.prompt import build_grounded_chat_prompt
    from ..ai.providers import generate_ai_response
    from ..general import database
    from ..general.chat_history import get_or_create_session, save_chat_turn
except ImportError:
    from ai.conversation import analyze_birthday_leave, build_conversation_transcript, build_retrieval_query, serialize_reasoning_context
    from ai.embeddings import get_embedding
    from ai.prompt import build_grounded_chat_prompt
    from ai.providers import generate_ai_response
    from general import database
    from general.chat_history import get_or_create_session, save_chat_turn

router = APIRouter(prefix="/api", tags=["chat"])


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    history: list[ChatTurn] = Field(default_factory=list, max_length=12)
    user_id: str | None = None
    session_id: str | None = None


@router.post("/chat")
async def chat_with_ai(req: ChatRequest, db: Session = Depends(database.get_db)):
    try:
        session_id = None
        if req.user_id:
            try:
                session = get_or_create_session(db, req.user_id, req.session_id, initial_title=req.message)
                session_id = str(session.id)
            except Exception as exc:
                print("Error resolving chat session:", exc)

        history = [turn.model_dump() for turn in req.history[-10:]]
        today = datetime.now(KUCHING_TZ).date()
        query_vector = get_embedding(build_retrieval_query(history, req.message), task_type=None)
        results = db.execute(text('''
            SELECT c.content, k.title, k.category, k.file_path
            FROM "AI chatbot"."document_chunks" c
            JOIN "AI chatbot"."knowledge_base" k ON c.doc_id = k.id
            ORDER BY c.embedding <=> :v LIMIT 4
        '''), {"v": str(query_vector)}).fetchall()

        if not results:
            bot_reply = "I don't have any manuals covering this topic yet."
            if session_id:
                try:
                    save_chat_turn(db, session_id, req.message, bot_reply, [])
                except Exception as exc:
                    print("Error saving chat turn:", exc)
            return {"sender": "bot", "message": bot_reply, "sources": [], "session_id": session_id}

        context_parts = []
        sources_list = []
        for content, title, category, file_path in results:
            context_parts.append(f"DOCUMENT TITLE: {title} | CATEGORY: {category}\nTEXT: {content}")
            sources_list.append({"title": title, "category": category, "content": content.strip(), "file_path": file_path})

        prompt = build_grounded_chat_prompt(
            today=today,
            conversation_text=build_conversation_transcript(history),
            birthday_reasoning_text=serialize_reasoning_context(analyze_birthday_leave(history, req.message, today)),
            context_text="\n\n---\n\n".join(context_parts),
            staff_question=req.message,
        )
        bot_reply = generate_ai_response(db, prompt)
        if session_id:
            try:
                save_chat_turn(db, session_id, req.message, bot_reply, sources_list)
            except Exception as exc:
                print("Error saving chat turn:", exc)
        return {"sender": "bot", "message": bot_reply, "sources": sources_list, "session_id": session_id}
    except Exception as exc:
        print("AI Chat Error:", exc)
        return {"sender": "bot", "message": "The AI servers are currently busy. Please try again.", "sources": []}
