import asyncio
from app.database.session import SessionLocal
from app.models.user import User

db = SessionLocal()
u = db.query(User).filter(User.username == 'test_admin_user').first()
if u:
    db.delete(u)
    try:
        db.commit()
        print("Success")
    except Exception as e:
        print(f"Error: {e}")
else:
    print("User not found")
