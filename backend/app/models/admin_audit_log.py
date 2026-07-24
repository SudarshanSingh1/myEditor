import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, JSON, DateTime, Uuid, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base

class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"
    
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    target_id = Column(Uuid(as_uuid=True), nullable=True, index=True) # ID of user, project, etc. affected
    action = Column(String(100), nullable=False, index=True)
    permission_used = Column(String(100), nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    actor = relationship("User", foreign_keys=[actor_id])
