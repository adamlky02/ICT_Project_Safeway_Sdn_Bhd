from sqlalchemy import Column, String, Text, TIMESTAMP, text, Boolean, Integer, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from database import Base

class User(Base):
    __tablename__ = "User_list"
    __table_args__ = {"schema": "AI chatbot"}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=False)
    full_name = Column(String(255))
    role = Column(String(20), server_default="staff")
    is_active = Column(Boolean, server_default="true")
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"))

class KnowledgeBase(Base):
    __tablename__ = "knowledge_base"
    __table_args__ = {"schema": "AI chatbot"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    category = Column(String(50))

    # --- THESE ARE THE LINES YOUR CODE IS LOOKING FOR ---
    file_path = Column(Text, nullable=False)
    file_type = Column(String(10))
    file_size = Column(Integer)

    uploaded_by = Column(UUID(as_uuid=True), ForeignKey('AI chatbot.User_list.id'))
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"))


class IntegrationSetting(Base):
    __tablename__ = "integration_settings"
    __table_args__ = {"schema": "AI chatbot"}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    category = Column(String(50), unique=True, nullable=False, index=True)
    provider = Column(String(100), nullable=False)
    mode = Column(String(20), nullable=False, server_default=text("'custom'"))
    config = Column(JSON, nullable=False, default=dict)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"))
    updated_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"), onupdate=text("now()"))