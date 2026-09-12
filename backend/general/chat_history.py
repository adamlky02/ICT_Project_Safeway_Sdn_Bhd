import uuid
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import Column, String, Text, TIMESTAMP, text, Boolean, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Session, relationship

from . import database

# ==========================================
# 1. SQLAlchemy Relational Models
# ==========================================

class ChatSession(database.Base):
    """
    Manages user chat sessions (threads).
    Stored in NeonDB under the "AI chatbot" schema.
    """
    __tablename__ = "chat_sessions"
    __table_args__ = {"schema": "AI chatbot"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey('AI chatbot.User_list.id', ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False, default="New Conversation")
    is_archived = Column(Boolean, default=False, server_default=text("false"))
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"))
    updated_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"), onupdate=text("now()"))

    # Cascade delete messages when session is deleted
    messages = relationship(
        "ChatMessageRecord",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="ChatMessageRecord.created_at"
    )


class ChatMessageRecord(database.Base):
    """
    Stores individual chat turns (user question & bot response).
    Maintains full citation source JSON for accurate RAG re-hydration.
    """
    __tablename__ = "chat_messages"
    __table_args__ = {"schema": "AI chatbot"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    session_id = Column(UUID(as_uuid=True), ForeignKey('AI chatbot.chat_sessions.id', ondelete="CASCADE"), nullable=False, index=True)
    sender = Column(String(20), nullable=False)  # "user" or "bot"
    content = Column(Text, nullable=False)
    sources = Column(JSON, nullable=True, default=list)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"), index=True)

    session = relationship("ChatSession", back_populates="messages")


# ==========================================
# 2. Pydantic Request & Response Schemas
# ==========================================

class SessionCreateReq(BaseModel):
    user_id: str
    title: Optional[str] = "New Conversation"

class SessionUpdateTitleReq(BaseModel):
    title: str = Field(min_length=1, max_length=255)

class MessageResponse(BaseModel):
    id: str
    session_id: str
    sender: str
    content: str
    sources: Optional[list] = []
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class SessionSummaryResponse(BaseModel):
    id: str
    user_id: str
    title: str
    is_archived: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_message: Optional[str] = None

    class Config:
        from_attributes = True

class SessionDetailResponse(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    messages: List[MessageResponse] = []

    class Config:
        from_attributes = True


# ==========================================
# 3. Core Database Service Functions
# ==========================================

def get_or_create_session(
    db: Session,
    user_id: str,
    session_id: Optional[str] = None,
    initial_title: Optional[str] = None
) -> ChatSession:
    """
    Retrieves an existing session belonging to user_id, or creates a new one.
    """
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user_id UUID format")

    if session_id:
        try:
            sess_uuid = uuid.UUID(session_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid session_id UUID format")

        session = db.query(ChatSession).filter(
            ChatSession.id == sess_uuid,
            ChatSession.user_id == user_uuid,
            ChatSession.is_archived == False
        ).first()

        if session:
            return session

    # Auto-generate title if provided (truncate up to 35 chars)
    title = "New Conversation"
    if initial_title and initial_title.strip():
        clean_title = initial_title.strip().replace("\n", " ")
        title = clean_title[:35] + ("..." if len(clean_title) > 35 else "")

    new_session = ChatSession(
        user_id=user_uuid,
        title=title,
        is_archived=False
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session


def save_chat_turn(
    db: Session,
    session_id: uuid.UUID | str,
    user_content: str,
    bot_content: str,
    sources: Optional[list] = None
) -> None:
    """
    Saves a complete conversation turn (user prompt and bot reply) in one transaction,
    and touches the updated_at timestamp of the session.
    """
    if isinstance(session_id, str):
        session_id = uuid.UUID(session_id)

    user_msg = ChatMessageRecord(
        session_id=session_id,
        sender="user",
        content=user_content,
        sources=[]
    )
    bot_msg = ChatMessageRecord(
        session_id=session_id,
        sender="bot",
        content=bot_content,
        sources=sources or []
    )

    db.add(user_msg)
    db.add(bot_msg)

    # Update session updated_at
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if session:
        session.updated_at = datetime.now()

    db.commit()


def get_user_sessions(db: Session, user_id: str) -> List[dict]:
    """
    Lists active sessions for a user, ordered by most recently updated first.
    Includes the snippet of the last message if available.
    """
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user_id format")

    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user_uuid, ChatSession.is_archived == False)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )

    result = []
    for s in sessions:
        last_msg = (
            db.query(ChatMessageRecord)
            .filter(ChatMessageRecord.session_id == s.id)
            .order_by(ChatMessageRecord.created_at.desc())
            .first()
        )
        result.append({
            "id": str(s.id),
            "user_id": str(s.user_id),
            "title": s.title,
            "is_archived": s.is_archived,
            "created_at": s.created_at,
            "updated_at": s.updated_at,
            "last_message": last_msg.content[:60] if last_msg else None
        })
    return result


def get_session_detail(db: Session, session_id: str, user_id: Optional[str] = None) -> dict:
    """
    Retrieves full conversation history for a specific session.
    """
    try:
        sess_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session_id format")

    query = db.query(ChatSession).filter(ChatSession.id == sess_uuid)
    if user_id:
        try:
            query = query.filter(ChatSession.user_id == uuid.UUID(user_id))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid user_id format")

    session = query.first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    messages = (
        db.query(ChatMessageRecord)
        .filter(ChatMessageRecord.session_id == sess_uuid)
        .order_by(ChatMessageRecord.created_at.asc())
        .all()
    )

    return {
        "id": str(session.id),
        "user_id": str(session.user_id),
        "title": session.title,
        "created_at": session.created_at,
        "updated_at": session.updated_at,
        "messages": [
            {
                "id": str(m.id),
                "session_id": str(m.session_id),
                "sender": m.sender,
                "content": m.content,
                "sources": m.sources or [],
                "created_at": m.created_at
            }
            for m in messages
        ]
    }


def update_session_title(db: Session, session_id: str, user_id: str, new_title: str) -> dict:
    """
    Renames a chat session title.
    """
    try:
        sess_uuid = uuid.UUID(session_id)
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")

    session = db.query(ChatSession).filter(
        ChatSession.id == sess_uuid,
        ChatSession.user_id == user_uuid
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.title = new_title.strip()
    session.updated_at = datetime.now()
    db.commit()
    db.refresh(session)
    return {"message": "Title updated", "id": str(session.id), "title": session.title}


def delete_session(db: Session, session_id: str, user_id: str) -> dict:
    """
    Deletes a session and cascades deletion of its messages.
    """
    try:
        sess_uuid = uuid.UUID(session_id)
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")

    session = db.query(ChatSession).filter(
        ChatSession.id == sess_uuid,
        ChatSession.user_id == user_uuid
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    db.delete(session)
    db.commit()
    return {"message": "Session deleted successfully", "id": session_id}


# ==========================================
# 4. FastAPI APIRouter Definition
# ==========================================

chat_history_router = APIRouter(prefix="/api/chat-history", tags=["Chat History"])


@chat_history_router.get("/sessions", response_model=List[SessionSummaryResponse])
def api_list_sessions(user_id: str = Query(..., description="User UUID"), db: Session = Depends(database.get_db)):
    """List all chat sessions belonging to the user."""
    return get_user_sessions(db, user_id)


@chat_history_router.post("/sessions", response_model=SessionSummaryResponse, status_code=status.HTTP_201_CREATED)
def api_create_session(req: SessionCreateReq, db: Session = Depends(database.get_db)):
    """Create a new blank chat session."""
    session = get_or_create_session(db, req.user_id, initial_title=req.title)
    return {
        "id": str(session.id),
        "user_id": str(session.user_id),
        "title": session.title,
        "is_archived": session.is_archived,
        "created_at": session.created_at,
        "updated_at": session.updated_at,
        "last_message": None
    }


@chat_history_router.get("/sessions/{session_id}", response_model=SessionDetailResponse)
def api_get_session(
    session_id: str,
    user_id: Optional[str] = Query(None, description="Optional user UUID for ownership verification"),
    db: Session = Depends(database.get_db)
):
    """Retrieve full messages for a specific session."""
    return get_session_detail(db, session_id, user_id)


@chat_history_router.patch("/sessions/{session_id}/title")
def api_update_title(
    session_id: str,
    req: SessionUpdateTitleReq,
    user_id: str = Query(..., description="User UUID"),
    db: Session = Depends(database.get_db)
):
    """Rename a session."""
    return update_session_title(db, session_id, user_id, req.title)


@chat_history_router.delete("/sessions/{session_id}")
def api_delete_session(
    session_id: str,
    user_id: str = Query(..., description="User UUID"),
    db: Session = Depends(database.get_db)
):
    """Delete a session and all its messages."""
    return delete_session(db, session_id, user_id)
