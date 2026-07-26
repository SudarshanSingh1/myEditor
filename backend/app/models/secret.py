from sqlalchemy import Column, String, DateTime
from app.database.base import Base
from app.utils.dates import utc_now
from app.utils.identifiers import generate_uuid

class Secret(Base):
    __tablename__ = "secrets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False, unique=True)
    category = Column(String(100), nullable=True)
    encrypted_value = Column(String, nullable=False)
    masked_value = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
