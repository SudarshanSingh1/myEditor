from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.user import User
from app.core.security import get_password_hash
from app.core.config import settings

def reset_password(email: str, new_password: str):
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        print(f"User {email} not found.")
        return
        
    user.password_hash = get_password_hash(new_password)
    db.commit()
    print(f"Successfully reset password for {email} to {new_password}")
    
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: python reset_password.py <email> <new_password>")
        sys.exit(1)
    reset_password(sys.argv[1], sys.argv[2])
