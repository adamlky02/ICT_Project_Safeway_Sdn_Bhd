from sqlalchemy import Column, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from database import Base

class User(Base):
    __tablename__ = "User_list"
    # Note the double quotes inside the string for the schema with a space
    __table_args__ = {"schema": '"AI chatbot"'}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    role = Column(String(20), server_default="user")