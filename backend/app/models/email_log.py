import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Enum, Uuid, Text, Integer

from app.database.base import Base

class EmailStatus(str, enum.Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"

class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recipient = Column(String(255), index=True, nullable=False)
    subject = Column(String(255), nullable=False)
    user_role = Column(String(50), nullable=True)
    status = Column(Enum(EmailStatus), default=EmailStatus.PENDING, index=True)
    provider = Column(String(50), default="MOCK")
    error_message = Column(Text, nullable=True)
    retries = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    sent_at = Column(DateTime(timezone=True), nullable=True)
    opened_at = Column(DateTime(timezone=True), nullable=True)
