import sqlalchemy
from sqlalchemy import text

DB_URL = "postgresql+psycopg2://neondb_owner:npg_V3wrHLOX0qZk@ep-floral-heart-ao77qzmm-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
engine = sqlalchemy.create_engine(DB_URL)
with engine.connect() as conn:
    users = conn.execute(text("SELECT id, email, created_at FROM users")).fetchall()
    print("Users:")
    for u in users:
        print(u)
    
    logs = conn.execute(text("SELECT id, user_id FROM execution_logs")).fetchall()
    print("Logs:")
    for l in logs:
        print(l)
