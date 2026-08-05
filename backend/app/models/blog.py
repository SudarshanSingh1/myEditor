import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, Uuid, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base


class BlogPost(Base):
    __tablename__ = "blog_posts"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    excerpt = Column(String(500), nullable=True)
    cover_image = Column(String(500), nullable=True)

    # Meta for SEO
    meta_title = Column(String(255), nullable=True)
    meta_description = Column(String(500), nullable=True)

    is_published = Column(Boolean, default=False, nullable=False)
    published_at = Column(DateTime(timezone=True), nullable=True)

    author_id = Column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    author = relationship("User")

    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
