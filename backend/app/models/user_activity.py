import uuid
from datetime import date
from sqlalchemy import Column, Integer, Date, Uuid, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database.base import Base


class UserActivity(Base):
    __tablename__ = "user_activities"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    activity_date = Column(Date, nullable=False, default=date.today)
    count = Column(Integer, default=1, nullable=False)

    user = relationship("User", back_populates="activities")

    __table_args__ = (
        UniqueConstraint("user_id", "activity_date", name="uix_user_date"),
    )
