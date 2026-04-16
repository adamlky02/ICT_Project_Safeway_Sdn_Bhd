from sqlalchemy import Column, String, Text, TIMESTAMP, text, Boolean, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from database import Base

# backend/models.py
class User(Base):
    __tablename__ = "User_list"
    __table_args__ = {"schema": "AI chatbot"}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=False)
    full_name = Column(String(255)) # This was the missing link
    role = Column(String(20), server_default="staff")
    is_active = Column(Boolean, server_default="true")
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"))

class KnowledgeBase(Base):
    __tablename__ = "knowledge_base"
    __table_args__ = {"schema": "AI chatbot"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(50), server_default="General")
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey('"AI chatbot"."User_list".id'))
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"))