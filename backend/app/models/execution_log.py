import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Enum, Uuid, ForeignKey, Text
from sqlalchemy.orm import relationship, backref
from app.database.base import Base

class ExecutionStatus(str, enum.Enum):
    QUEUED = "Queued"
    RUNNING = "Running"
    SUCCESS = "Success"
    COMPILE_ERROR = "Compile Error"
    RUNTIME_ERROR = "Runtime Error"
    TIMEOUT = "Timeout"
    SYSTEM_ERROR = "System Error"
    CANCELLED = "Cancelled"

class ExecutionLog(Base):
    __tablename__ = "execution_logs"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    project_id = Column(Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    
    language = Column(String(50), nullable=False)
    status = Column(Enum(ExecutionStatus), nullable=False)
    execution_time_ms = Column(Integer, nullable=True)  # How long it took in milliseconds
    
    compiler = Column(String(100), nullable=True)
    cpu_usage = Column(String(50), nullable=True)
    memory_usage = Column(String(50), nullable=True)
    container_id = Column(String(100), nullable=True)
    worker_node = Column(String(100), nullable=True)
    queue_position = Column(Integer, nullable=True)
    exit_code = Column(Integer, nullable=True)
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    env_vars = Column(String(1000), nullable=True)
    logs = Column(Text, nullable=True)
    error_output = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    user = relationship("User", backref="executions")
    project = relationship("Project", backref=backref("executions", cascade="all, delete-orphan", passive_deletes=True))
