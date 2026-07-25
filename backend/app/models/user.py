import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Enum, Uuid, Integer
from sqlalchemy.orm import relationship
from app.database.base import Base

class RoleEnum(str, enum.Enum):
    USER = "USER"
    MODERATOR = "MODERATOR"
    ADMIN = "ADMIN"
    OWNER = "OWNER"

class StatusEnum(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    SUSPENDED = "SUSPENDED"
    BANNED = "BANNED"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"

class User(Base):
    __tablename__ = "users"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    first_name = Column(String(50), nullable=True)
    last_name = Column(String(50), nullable=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    avatar = Column(String(255), nullable=True)
    department = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    designation = Column(String(100), nullable=True)
    notes = Column(String(1000), nullable=True)
    permissions_preview = Column(String(1000), nullable=True)
    
    role = Column(Enum(RoleEnum), default=RoleEnum.USER, nullable=False)
    status = Column(Enum(StatusEnum), default=StatusEnum.PENDING_VERIFICATION, nullable=False)
    
    email_verified = Column(Boolean, nullable=False, default=False, server_default="false")
    is_deleted = Column(Boolean, nullable=False, default=False, server_default="false")
    must_change_password = Column(Boolean, nullable=False, default=False, server_default="false")
    temp_password_expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # RBAC effective permissions cache (list of permission nodes)
    from sqlalchemy import JSON, text
    effective_permissions = Column(JSON, nullable=True, default=list, server_default="[]")
    
    # 2FA and Security
    totp_secret = Column(String(255), nullable=True)
    totp_enabled = Column(Boolean, nullable=False, default=False, server_default="false")
    recovery_codes = Column(String(1000), nullable=True)
    failed_login_attempts = Column(Integer, nullable=False, default=0, server_default="0")
    account_locked_until = Column(DateTime(timezone=True), nullable=True)
    
    # Profile Extensions
    bio = Column(String(1000), nullable=True)
    timezone = Column(String(50), nullable=True, default="UTC", server_default="'UTC'")
    theme_preference = Column(String(20), nullable=True, default="system", server_default="'system'")
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan", passive_deletes=True)
    feedback_submissions = relationship("Feedback", foreign_keys="[Feedback.user_id]", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    oauth_accounts = relationship("OAuthAccount", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    activities = relationship("UserActivity", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
