from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Enum, Text, Uuid
from sqlalchemy.orm import relationship
import enum
from app.database.base import Base
from app.utils.dates import utc_now
from app.utils.identifiers import generate_uuid

class NotificationType(str, enum.Enum):
    SYSTEM = "SYSTEM"
    SECURITY = "SECURITY"
    MAINTENANCE = "MAINTENANCE"
    QUEUE = "QUEUE"
    EXECUTION = "EXECUTION"
    BROADCAST = "BROADCAST"

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(32), primary_key=True, default=generate_uuid)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    type = Column(Enum(NotificationType), default=NotificationType.SYSTEM, nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    user = relationship("User")


class UserNotificationSettings(Base):
    __tablename__ = "user_notification_settings"

    id = Column(String(32), primary_key=True, default=generate_uuid)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    email_alerts = Column(Boolean, default=True)
    system_alerts = Column(Boolean, default=True)
    security_alerts = Column(Boolean, default=True)
    marketing_emails = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    user = relationship("User")
