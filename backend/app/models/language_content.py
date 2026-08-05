import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, Uuid, JSON
from app.database.base import Base


class LanguageContent(Base):
    __tablename__ = "language_contents"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(
        String(100), unique=True, index=True, nullable=False
    )  # e.g. "online-cpp-compiler"
    language_id = Column(String(50), nullable=False)  # e.g. "cpp"

    # Meta tags
    meta_title = Column(String(255), nullable=False)
    meta_description = Column(String(500), nullable=False)
    meta_keywords = Column(String(500), nullable=True)

    # Page Content
    h1_heading = Column(String(255), nullable=False)
    h2_subheading = Column(String(255), nullable=True)
    hero_description = Column(Text, nullable=True)

    # JSON content for structured sections
    about_content = Column(Text, nullable=True)  # Markdown or HTML
    features = Column(
        JSON, nullable=True
    )  # List of dicts: {"title": "", "desc": "", "icon": ""}
    faq = Column(JSON, nullable=True)  # List of dicts: {"question": "", "answer": ""}

    # Editor Starter Code
    starter_code = Column(Text, nullable=False)
    starter_file_name = Column(String(100), nullable=False)

    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
