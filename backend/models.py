from sqlalchemy import Column, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from database import Base

class User(Base):
    __tablename__ = "User_list"
    # Just the string, no extra internal quotes.
    # SQLAlchemy will handle the double-quoting for the space automatically.
    __table_args__ = {"schema": "AI chatbot"}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    role = Column(String(20), server_default="user")