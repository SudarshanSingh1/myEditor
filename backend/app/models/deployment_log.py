from sqlalchemy import Column, String, DateTime, ForeignKey, Uuid
from sqlalchemy.sql import func
import uuid
from app.database.base import Base

class DeploymentLog(Base):
    __tablename__ = "deployment_logs"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version = Column(String, nullable=False)
    build_number = Column(String, nullable=False)
    environment = Column(String, nullable=False)
    release_notes = Column(String, nullable=True)
    status = Column(String, default="SUCCESS")
    
    deployed_at = Column(DateTime(timezone=True), server_default=func.now())
    deployed_by_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

