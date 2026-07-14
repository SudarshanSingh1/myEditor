import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("NO DB URL")
    exit(1)

engine = create_engine(DATABASE_URL)
with engine.connect() as conn:
    print("Connected to DB")
    # Update alembic_version
    conn.execute(text("UPDATE alembic_version SET version_num = '7ca384dc5d9d'"))
    print("Updated alembic_version to 7ca384dc5d9d")
    
    # Drop user_activities if it exists
    try:
        conn.execute(text("DROP TABLE IF EXISTS user_activities CASCADE"))
        print("Dropped user_activities")
    except Exception as e:
        print("Error dropping table:", e)
    
    conn.commit()
    print("Done")
