import random
from datetime import datetime, timedelta, timezone
import uuid
from app.database.session import SessionLocal
from app.models.execution_log import ExecutionLog, ExecutionStatus
from app.models.feedback import Feedback, FeedbackStatus
from app.models.project import Project

def seed():
    db = SessionLocal()
    
    # Check if there are projects
    projects = db.query(Project).all()
    if not projects:
        print("No projects found, skipping seed.")
        return
        
    print(f"Found {len(projects)} projects.")
    
    # 1. Seed Executions (spread over last 30 days)
    print("Seeding Executions...")
    now = datetime.now(timezone.utc)
    for i in range(150):
        days_ago = random.randint(0, 30)
        exec_date = now - timedelta(days=days_ago)
        
        # Pick random project
        p = random.choice(projects)
        
        # Determine status
        r = random.random()
        if r < 0.7:
            status = ExecutionStatus.SUCCESS
        elif r < 0.85:
            status = ExecutionStatus.COMPILE_ERROR
        elif r < 0.95:
            status = ExecutionStatus.RUNTIME_ERROR
        else:
            status = ExecutionStatus.TIMEOUT
            
        el = ExecutionLog(
            project_id=p.id,
            user_id=p.owner_id,
            language=p.language or 'python',
            status=status,
            execution_time_ms=random.randint(50, 1500)
        )
        el.created_at = exec_date
        db.add(el)
        
    # 2. Seed Feedback Ratings
    print("Seeding Feedback...")
    for i in range(50):
        rating = random.choices([1, 2, 3, 4, 5], weights=[0.05, 0.05, 0.1, 0.3, 0.5])[0]
        f = Feedback(
            user_id=random.choice(projects).owner_id,
            category="Bug Report",
            priority="Medium",
            subject="Love the app!",
            description="This is auto-seeded feedback.",
            rating=rating,
            status=FeedbackStatus.NEW
        )
        days_ago = random.randint(0, 30)
        f.created_at = now - timedelta(days=days_ago)
        db.add(f)
        
    try:
        db.commit()
        print("Successfully seeded analytics data!")
    except Exception as e:
        db.rollback()
        print(f"Failed to seed: {e}")

if __name__ == "__main__":
    seed()
