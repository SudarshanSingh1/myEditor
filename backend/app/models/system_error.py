from sqlalchemy import Column, String, Text, ForeignKey, DateTime, Uuid, Enum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
import enum

from app.database.base import Base


class ErrorTypeEnum(str, enum.Enum):
    HTTP_500 = "HTTP 500"
    HTTP_404 = "HTTP 404"
    HTTP_403 = "HTTP 403"
    HTTP_401 = "HTTP 401"
    COMPILER = "Compiler"
    RUNTIME = "Runtime"
    DOCKER = "Docker"
    EXECUTION = "Execution"
    WEBSOCKET = "WebSocket"
    DATABASE = "Database"
    UNKNOWN = "Unknown"


class SystemError(Base):
    __tablename__ = "system_errors"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
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

    error_type = Column(
        Enum(ErrorTypeEnum), nullable=False, default=ErrorTypeEnum.UNKNOWN
    )
    message = Column(String(500), nullable=True)
    route = Column(String(255), nullable=True)
    browser = Column(String(255), nullable=True)
    stack_trace = Column(Text, nullable=False)

    user = relationship("User")
