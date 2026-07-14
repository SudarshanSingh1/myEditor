import sys
from app.database.session import SessionLocal
from app.models.user import User

db = SessionLocal()
# Assuming we want to see what happens when we delete user with id '5b6304bc-4a1c-4d59-b88a-e0910c7f53ca'
user_id = '5b6304bc-4a1c-4d59-b88a-e0910c7f53ca'
u = db.query(User).filter(User.id == user_id).first()
if u:
    db.delete(u)
    try:
        db.commit()
        print("Success")
    except Exception as e:
        import traceback
        traceback.print_exc()
else:
    print("User not found")
