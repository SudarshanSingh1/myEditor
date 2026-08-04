import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Uuid, ForeignKey, Index, Text, UniqueConstraint
from sqlalchemy.orm import relationship, backref
from app.database.base import Base

class Folder(Base):
    __tablename__ = "folders"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    parent_id = Column(Uuid(as_uuid=True), ForeignKey("folders.id", ondelete="CASCADE"), nullable=True)
    
    name = Column(String(255), nullable=False)
    path = Column(String(1000), nullable=False)
    depth = Column(Integer, default=0, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    project = relationship("Project", backref=backref("folders", cascade="all, delete-orphan", passive_deletes=True))
    parent = relationship("Folder", remote_side=[id])

    __table_args__ = (
        Index("ix_folders_project_id", "project_id"),
        Index("ix_folders_parent_id", "parent_id"),
        Index("ix_folders_path", "path"),
        Index("ix_folders_name", "name"),
    )

class File(Base):
    __tablename__ = "files"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    folder_id = Column(Uuid(as_uuid=True), ForeignKey("folders.id", ondelete="CASCADE"), nullable=True)
    
    name = Column(String(255), nullable=False)
    extension = Column(String(50), nullable=True)
    language = Column(String(50), nullable=True)
    
    content = Column(Text, nullable=True)
    size = Column(Integer, default=0, nullable=False)
    encoding = Column(String(50), default="utf-8", nullable=False)
    
    version = Column(Integer, default=1, nullable=False)
    is_read_only = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    project = relationship("Project", backref=backref("files", cascade="all, delete-orphan", passive_deletes=True))
    folder = relationship("Folder", backref=backref("files", cascade="all, delete-orphan", passive_deletes=True))

    __table_args__ = (
        Index("ix_files_project_id", "project_id"),
        Index("ix_files_folder_id", "folder_id"),
        Index("ix_files_name", "name"),
        Index("ix_files_extension", "extension"),
    )

class FileVersion(Base):
    __tablename__ = "file_versions"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    file_id = Column(Uuid(as_uuid=True), ForeignKey("files.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, nullable=False)
    content = Column(Text, nullable=True)
    size = Column(Integer, default=0, nullable=False)
    hash = Column(String(64), nullable=True)

    # True when this version was captured as a pre-deletion snapshot (for recovery).
    # These versions are retained even after the parent file is soft-deleted.
    is_pre_delete = Column(Boolean, nullable=False, default=False, server_default="false")

    # Optional human-readable description of the save (e.g. "pre-delete snapshot", "manual checkpoint")
    change_description = Column(String(255), nullable=True)

    created_by = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    file = relationship("File", backref="history")
    author = relationship("User")

    __table_args__ = (
        # Enforce uniqueness: a file can have each version number only once.
        # Prevents race-condition duplicate inserts on concurrent saves.
        UniqueConstraint("file_id", "version_number", name="uq_file_versions_file_version"),
        Index("ix_file_versions_file_id", "file_id"),
        Index("ix_file_versions_created_at", "created_at"),
    )
