import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Boolean,
    DateTime,
    Enum,
    Uuid,
    Text,
    ForeignKey,
    JSON,
    Index,
)
from sqlalchemy.orm import relationship
from app.database.base import Base


class EmailTemplateType(str, enum.Enum):
    VERIFICATION = "VERIFICATION"
    PASSWORD_RESET = "PASSWORD_RESET"
    WELCOME = "WELCOME"
    LOGIN_ALERT = "LOGIN_ALERT"
    CUSTOM = "CUSTOM"
    BROADCAST = "BROADCAST"
    SMTP_TEST = "SMTP_TEST"


class EmailTemplate(Base):
    __tablename__ = "email_templates"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Identity
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    template_type = Column(
        Enum(EmailTemplateType), nullable=False, index=True
    )
    description = Column(Text, nullable=True)

    # Content
    subject_template = Column(String(255), nullable=False)
    html_content = Column(Text, nullable=False)
    text_content = Column(Text, nullable=True)  # Plain-text fallback

    # Visual / design configuration stored as JSON
    # Example: {"theme": "dark", "backgroundColor": "#09090b", "primaryColor": "#8b5cf6", ...}
    design_config = Column(JSON, nullable=True, default=dict)

    # Allowed variable names for this template, stored as JSON list
    # Example: ["{{app_name}}", "{{user_name}}", "{{otp}}"]
    variables = Column(JSON, nullable=True, default=list)

    # State
    is_active = Column(Boolean, nullable=False, default=False, server_default="false", index=True)
    is_default = Column(Boolean, nullable=False, default=False, server_default="false")

    # Audit
    created_by = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    updated_by = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
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
        nullable=True,
    )

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    updater = relationship("User", foreign_keys=[updated_by])

    __table_args__ = (
        # Composite index for the most common lookup: active template of a given type
        Index(
            "ix_email_templates_type_active",
            "template_type",
            "is_active",
        ),
    )
