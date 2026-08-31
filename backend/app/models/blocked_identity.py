import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from app.database.session import Base
import enum

class BlockReason(str, enum.Enum):
    PERMANENT_DELETE = "PERMANENT_DELETE"
    BANNED = "BANNED"

class BlockedIdentity(Base):
    __tablename__ = "blocked_identities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    provider = Column(String(50), nullable=False, index=True) # e.g., "email", "github", "google"
    provider_id = Column(String(255), nullable=False, index=True) # stable external ID or normalized email
    original_user_id = Column(UUID(as_uuid=True), nullable=True) # The user this originally belonged to
    reason = Column(Enum(BlockReason), nullable=False, default=BlockReason.PERMANENT_DELETE)
    details = Column(Text, nullable=True)
    blocked_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

