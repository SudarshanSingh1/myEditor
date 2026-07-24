import uuid
from sqlalchemy import Column, String, Uuid
from sqlalchemy.orm import relationship
from app.database.base import Base

class Permission(Base):
    __tablename__ = "permissions"
    
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    node = Column(String(100), unique=True, index=True, nullable=False) # e.g. "users.delete"
    description = Column(String(255), nullable=True)
    category = Column(String(50), nullable=True) # e.g. "Users", "Projects"

    role_permissions = relationship("RolePermission", back_populates="permission", cascade="all, delete-orphan", passive_deletes=True)
