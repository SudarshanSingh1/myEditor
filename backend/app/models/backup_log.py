from sqlalchemy import Column, String, Integer, DateTime, JSON, Enum
from sqlalchemy.sql import func
import enum
import uuid
from app.database.base import Base

class BackupStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class BackupType(str, enum.Enum):
    MANUAL = "MANUAL"
    SCHEDULED = "SCHEDULED"

class BackupLog(Base):
    __tablename__ = "backup_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String, nullable=False)
    size_bytes = Column(Integer, nullable=True)
    status = Column(String, default=BackupStatus.PENDING)
    type = Column(String, default=BackupType.MANUAL)
    metadata_json = Column(JSON, default={})
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
