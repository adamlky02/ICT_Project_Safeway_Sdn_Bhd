from sqlalchemy import Column, String, Text, TIMESTAMP, text, Boolean, Integer, ForeignKey, JSON, BigInteger, Index
from sqlalchemy.dialects.postgresql import UUID
from .database import Base
from uuid import uuid4

# User Model (maps staff and administrator accounts to the user table)
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

class AuthSession(Base):
    """Persistent login sessions; separate from conversation history sessions."""
    __tablename__ = "auth_sessions"
    __table_args__ = {"schema": "AI chatbot"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('AI chatbot.User_list.id', ondelete="CASCADE"), nullable=False, index=True)
    expires_at = Column(Integer, nullable=False)
    revoked = Column(Boolean, nullable=False, default=False, server_default=text("false"))
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"))


# Knowledge Base Model (stores uploaded document metadata used by retrieval)
class KnowledgeBase(Base):
    __tablename__ = "knowledge_base"
    __table_args__ = {"schema": "AI chatbot"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    category = Column(String(50))

    # File Metadata (links the database record to its stored document object)
    file_path = Column(Text, nullable=False)
    file_type = Column(String(10))
    file_size = Column(Integer)

    uploaded_by = Column(UUID(as_uuid=True), ForeignKey('AI chatbot.User_list.id'))
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"))


# Integration Setting Model (stores provider configuration for external services)
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


# Authenticator State (optional per-account enrollment; reset approval preserves a mandatory re-enrollment state).
class Authenticator(Base):
    __tablename__ = 'authenticators'
    __table_args__ = {'schema': 'AI chatbot'}
    user_id = Column(UUID(as_uuid=True), ForeignKey('AI chatbot.User_list.id', ondelete='CASCADE'), primary_key=True)
    enabled = Column(Boolean, nullable=False, default=False, server_default=text('false'))
    requires_enrollment = Column(Boolean, nullable=False, default=False, server_default=text('false'))
    secret = Column(Text)
    pending_secret = Column(Text)
    pending_expires = Column(BigInteger)
    generation = Column(Integer, nullable=False, default=0, server_default=text('0'))
    last_counter = Column(BigInteger)
    failures = Column(Integer, nullable=False, default=0, server_default=text('0'))
    lock_until = Column(BigInteger)
    recovery_hashes = Column(JSON, nullable=False, default=list)
    enrolled_at = Column(BigInteger)
    reset_sequence = Column(Integer, nullable=False, default=0, server_default=text('0'))


# Revocable Sessions (a dedicated table avoids collisions with older auth_sessions layouts without changing legacy rows).
class AuthSession(Base):
    __tablename__ = 'safeway_auth_sessions'
    __table_args__ = {'schema': 'AI chatbot'}
    token_hash = Column(String(64), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('AI chatbot.User_list.id', ondelete='CASCADE'), nullable=False, index=True)
    purpose = Column(String(20), nullable=False)
    portal_role = Column(String(20), nullable=False)
    generation = Column(Integer, nullable=False)
    expires_at = Column(BigInteger, nullable=False, index=True)
    binding = Column(String(64))
    mfa_verified = Column(Boolean, nullable=False, default=False)


# Reset Review Queue (a partial unique index allows one pending request per account while retaining decision history).
class MfaResetRequest(Base):
    __tablename__ = 'mfa_reset_requests'
    __table_args__ = (Index('one_pending_mfa_reset_per_user', 'user_id', unique=True,
                           postgresql_where=text("status = 'pending'"), sqlite_where=text("status = 'pending'")),
                      {'schema': 'AI chatbot'})
    id = Column(UUID(as_uuid=True), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('AI chatbot.User_list.id', ondelete='CASCADE'), nullable=False, index=True)
    status = Column(String(20), nullable=False)
    reason = Column(Text, nullable=False)
    request_number = Column(Integer, nullable=False)
    generation = Column(Integer, nullable=False)
    created_at = Column(BigInteger, nullable=False)
    reviewed_at = Column(BigInteger)
    reviewer_id = Column(UUID(as_uuid=True), ForeignKey('AI chatbot.User_list.id', ondelete='SET NULL'))
    review_note = Column(Text)


# Shared Throttling (request buckets survive deploys and are independent of browser sessions or challenge tokens).
class AuthRateLimit(Base):
    __tablename__ = 'auth_rate_limits'
    __table_args__ = {'schema': 'AI chatbot'}
    key = Column(String(64), primary_key=True)
    count = Column(Integer, nullable=False)
    window_start = Column(BigInteger, nullable=False, index=True)


# Security Audit (records lifecycle events without passwords, QR data, verification codes, or session tokens).
class SecurityEvent(Base):
    __tablename__ = 'security_events'
    __table_args__ = {'schema': 'AI chatbot'}
    id = Column(UUID(as_uuid=True), primary_key=True)
    event = Column(String(50), nullable=False)
    subject_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    actor_id = Column(UUID(as_uuid=True), nullable=False)
    occurred_at = Column(BigInteger, nullable=False)
    details = Column(JSON, nullable=False, default=dict)
