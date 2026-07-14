import sys
from app.database.session import SessionLocal
from app.models.user import User

db = SessionLocal()
users = db.query(User).all()
print([u.username for u in users])
