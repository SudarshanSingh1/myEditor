import sqlalchemy
from sqlalchemy import text

DB_URL = "postgresql+psycopg2://neondb_owner:npg_V3wrHLOX0qZk@ep-floral-heart-ao77qzmm-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
engine = sqlalchemy.create_engine(DB_URL)
with engine.connect() as conn:
    print("==================================================")
    print("1. Verify DATABASE_URL")
    print("==================================================")
    print("Host: ep-floral-heart-ao77qzmm-pooler.c-2.ap-southeast-1.aws.neon.tech")
    print("Database: neondb")
    print("Schema: public")
    print("Environment: production (Neon DB)")
    
    print("\n==================================================")
    print("2. Count Production Data")
    print("==================================================")
    users_count = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()
    projects_count = conn.execute(text("SELECT COUNT(*) FROM projects")).scalar()
    logs_count = conn.execute(text("SELECT COUNT(*) FROM execution_logs")).scalar()
    feedback_count = conn.execute(text("SELECT COUNT(*) FROM feedback")).scalar()
    print(f"users: {users_count}")
    print(f"projects: {projects_count}")
    print(f"execution_logs: {logs_count}")
    print(f"feedback: {feedback_count}")

    # Assuming sudarshankushwaha1435@gmail.com is MY_USER_ID based on the name
    user = conn.execute(text("SELECT id, email, created_at FROM users WHERE email = 'sudarshankushwaha1435@gmail.com' LIMIT 1")).fetchone()
    if user:
        user_id = user[0]
        user_logs = conn.execute(text(f"SELECT COUNT(*) FROM execution_logs WHERE user_id = '{user_id}'")).scalar()
        print(f"\nExecution Logs for MY_USER_ID ({user_id}): {user_logs}")
        
        print("\n==================================================")
        print("3. Verify User Identity")
        print("==================================================")
        print(f"user id: {user[0]}")
        print(f"email: {user[1]}")
        print(f"created_at: {user[2]}")
        
        print("\n==================================================")
        print("4. Verify Dashboard Query")
        print("==================================================")
        query = f"""
            SELECT DATE(created_at) as exec_date, COUNT(*) as count 
            FROM execution_logs 
            WHERE user_id = '{user_id}' AND execution_time_ms > 0
            GROUP BY DATE(created_at) 
            ORDER BY DATE(created_at)
        """
        rows = conn.execute(text(query)).fetchall()
        for row in rows:
            print(f"{row[0]} | {row[1]}")

