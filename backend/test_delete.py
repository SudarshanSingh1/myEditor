import sys
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.user import User, RoleEnum
from app.models.project import Project

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

user = db.query(User).filter_by(email="abc@gmail.com").first()
if user:
    print(f"Deleting user {user.id}")
    db.delete(user)
    try:
        db.commit()
        print("Delete successful!")
    except Exception as e:
        print("Delete failed:", e)

