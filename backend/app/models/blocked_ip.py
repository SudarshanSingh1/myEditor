import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Uuid, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base

class BlockedIP(Base):
    __tablename__ = "blocked_ips"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ip_address = Column(String(45), nullable=False, unique=True, index=True)
    reason = Column(String(255), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True) # Null = Permanent
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_by_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    created_by = relationship("User", foreign_keys=[created_by_id])
