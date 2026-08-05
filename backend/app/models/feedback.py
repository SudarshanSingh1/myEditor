from sqlalchemy import Column, String, Text, ForeignKey, Enum, DateTime, Uuid, Integer
from sqlalchemy.orm import relationship
import enum
from datetime import datetime, timezone
import uuid

from app.database.base import Base


class FeedbackCategory(str, enum.Enum):
    BUG = "Bug Report"
    FEATURE = "Feature Request"
    UI = "UI Improvement"
    PERFORMANCE = "Performance"
    SECURITY = "Security"
    SUGGESTION = "Suggestion"
    QUESTION = "Question"
    OTHER = "Other"


class FeedbackPriority(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class FeedbackStatus(str, enum.Enum):
    NEW = "New"
    IN_REVIEW = "In Review"
    PLANNED = "Planned"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    REJECTED = "Rejected"


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    category = Column(Enum(FeedbackCategory), nullable=False)
    priority = Column(Enum(FeedbackPriority), nullable=False)
    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)

    # Metadata
    browser_info = Column(String(255), nullable=True)
    os = Column(String(100), nullable=True)
    app_version = Column(String(50), nullable=True)
    current_route = Column(String(255), nullable=True)

    # Admin Tracking
    status = Column(Enum(FeedbackStatus), nullable=False, default=FeedbackStatus.NEW)
    rating = Column(Integer, nullable=True)  # 1 to 5 rating
    assigned_to = Column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    admin_reply = Column(Text, nullable=True)

    user = relationship(
        "User", foreign_keys=[user_id], back_populates="feedback_submissions"
    )
    assignee = relationship(
        "User", foreign_keys=[assigned_to], backref="assigned_feedbacks"
    )
