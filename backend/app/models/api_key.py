from sqlalchemy import Column, String, DateTime, JSON
from app.database.base import Base
from app.utils.dates import utc_now
from app.utils.identifiers import generate_uuid

class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(String(32), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    key_hash = Column(String(255), nullable=False, unique=True)
    prefix = Column(String(32), nullable=False)
    scopes = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
