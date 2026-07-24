import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Uuid, Boolean, Text
from app.database.base import Base

class GuestSession(Base):
    __tablename__ = "guest_sessions"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ip_address = Column(String(45), nullable=False, index=True)
    fingerprint = Column(String(255), nullable=True, index=True)
    
    execution_count = Column(Integer, default=0, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    # Whether the guest converted to a logged-in user
    is_converted = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
