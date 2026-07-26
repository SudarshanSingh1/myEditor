import sys
import os
from sqlalchemy import create_engine, select, func
from sqlalchemy.orm import sessionmaker

# Use the same connection string from backend
DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/hamara_editor"

try:
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    # We need to add backend to sys.path
    sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
    
    from app.models.user import User
    from app.models.execution_log import ExecutionLog
    from app.models.user_activity import UserActivity
    
    users = db.execute(select(User)).scalars().all()
    print("Users:")
    for u in users:
        exec_count = db.execute(select(func.count(ExecutionLog.id)).where(ExecutionLog.user_id == u.id)).scalar()
        act_count = db.execute(select(func.sum(UserActivity.count)).where(UserActivity.user_id == u.id)).scalar()
        print(f"User {u.username} ({u.id}): {exec_count} executions, {act_count} activity sum")
        
except Exception as e:
    print(f"Error: {e}")
