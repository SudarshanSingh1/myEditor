import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Enum, Uuid
from app.database.base import Base

class RoleEnum(str, enum.Enum):
    USER = "USER"
    MODERATOR = "MODERATOR"
    ADMIN = "ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"

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
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime(timezone=True), nullable=True)
