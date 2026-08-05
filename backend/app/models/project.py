import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Enum, Uuid, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database.base import Base


class ProjectVisibilityEnum(str, enum.Enum):
    PRIVATE = "PRIVATE"
    UNLISTED = "UNLISTED"
    PUBLIC = "PUBLIC"


class Project(Base):
    __tablename__ = "projects"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    name = Column(String(100), index=True, nullable=False)
    description = Column(String(500), nullable=True)
    language = Column(String(50), nullable=True)
    visibility = Column(
        Enum(ProjectVisibilityEnum),
        default=ProjectVisibilityEnum.PRIVATE,
        index=True,
        nullable=False,
    )

    favorite = Column(Boolean, nullable=False, default=False, server_default="false")
    color = Column(String(50), nullable=True)
    icon = Column(String(50), nullable=True)
    slug = Column(String(150), index=True, nullable=False)
    github_repo_url = Column(String(500), nullable=True)

    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    last_opened_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    owner = relationship("User", back_populates="projects")

    __table_args__ = (
        Index("ix_projects_owner_id_updated_at", "owner_id", "updated_at"),
    )
