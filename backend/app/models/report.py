from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, Text, Uuid
from sqlalchemy.orm import relationship
import enum
from app.database.base import Base
from app.utils.dates import utc_now
from app.utils.identifiers import generate_uuid


class ReportTargetType(str, enum.Enum):
    USER = "USER"
    PROJECT = "PROJECT"


class ReportStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    REJECTED = "REJECTED"


class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    reporter_id = Column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    target_type = Column(Enum(ReportTargetType), nullable=False)
    target_id = Column(String(36), nullable=False)  # User ID or Project ID
    reason = Column(Text, nullable=False)
    status = Column(Enum(ReportStatus), default=ReportStatus.PENDING, nullable=False)
    assigned_to = Column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    reporter = relationship("User", foreign_keys=[reporter_id])
    assignee = relationship("User", foreign_keys=[assigned_to])
