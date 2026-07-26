from sqlalchemy import Column, String, DateTime, Boolean, Integer
from app.database.base import Base
from app.utils.dates import utc_now
from app.utils.identifiers import generate_uuid

class FeatureFlag(Base):
    __tablename__ = "feature_flags"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    key = Column(String(255), nullable=False, unique=True)
    description = Column(String(500), nullable=True)
    enabled = Column(Boolean, default=False, nullable=False)
    environment = Column(String(100), default="production", nullable=False)
    rollout_percentage = Column(Integer, default=100, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
