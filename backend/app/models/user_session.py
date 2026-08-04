import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database.base import Base

class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    session_token_jti = Column(String(255), unique=True, index=True, nullable=False)
    
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)
    device_type = Column(String(50), nullable=True)
    browser = Column(String(50), nullable=True)
    os = Column(String(50), nullable=True)
    
    is_active = Column(Boolean, nullable=False, default=True)

    # Refresh token rotation: SHA-256 hash of the current refresh token.
    # On every /auth/refresh call, the incoming token hash is validated against this field.
    # A mismatch means the token was already rotated (replay attack) — session is invalidated.
    refresh_token_hash = Column(String(64), nullable=True, index=True)

    # Geographic metadata
    country = Column(String(100), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_active_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=False)

    user = relationship("User", back_populates="sessions")
