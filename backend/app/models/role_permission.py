import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, Enum, ForeignKey, Uuid, DateTime
from sqlalchemy.orm import relationship
from app.database.base import Base
from app.models.user import RoleEnum


class RolePermission(Base):
    __tablename__ = "role_permissions"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role = Column(Enum(RoleEnum), nullable=False, index=True)
    permission_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("permissions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    permission = relationship("Permission", back_populates="role_permissions")
