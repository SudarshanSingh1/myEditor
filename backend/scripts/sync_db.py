import os
import sys
import psycopg

database_url = os.environ.get("DATABASE_URL")
if not database_url:
    print("DATABASE_URL not found")
    sys.exit(1)

# SQLAlchemy format might have postgresql+psycopg://
if database_url.startswith("postgresql+psycopg://"):
    database_url = database_url.replace("postgresql+psycopg://", "postgresql://")

try:
    with psycopg.connect(database_url) as conn:
        with conn.cursor() as cur:
            # List of ADD COLUMN statements
            statements = [
                # execution_logs
                "ALTER TABLE execution_logs ADD COLUMN IF NOT EXISTS compiler VARCHAR(100);",
                "ALTER TABLE execution_logs ADD COLUMN IF NOT EXISTS cpu_usage VARCHAR(50);",
                "ALTER TABLE execution_logs ADD COLUMN IF NOT EXISTS memory_usage VARCHAR(50);",
                "ALTER TABLE execution_logs ADD COLUMN IF NOT EXISTS container_id VARCHAR(100);",
                "ALTER TABLE execution_logs ADD COLUMN IF NOT EXISTS worker_node VARCHAR(100);",
                "ALTER TABLE execution_logs ADD COLUMN IF NOT EXISTS queue_position INTEGER;",
                "ALTER TABLE execution_logs ADD COLUMN IF NOT EXISTS exit_code INTEGER;",
                "ALTER TABLE execution_logs ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE;",
                "ALTER TABLE execution_logs ADD COLUMN IF NOT EXISTS end_time TIMESTAMP WITH TIME ZONE;",
                "ALTER TABLE execution_logs ADD COLUMN IF NOT EXISTS env_vars VARCHAR(1000);",
                "ALTER TABLE execution_logs ADD COLUMN IF NOT EXISTS logs TEXT;",
                "ALTER TABLE execution_logs ADD COLUMN IF NOT EXISTS error_output TEXT;",
                # system_settings
                "ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS app_name VARCHAR DEFAULT 'Hamara Editor' NOT NULL;",
                "ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS default_timezone VARCHAR DEFAULT 'UTC' NOT NULL;",
                "ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS queue_limits INTEGER DEFAULT 1000 NOT NULL;",
                "ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS worker_limits INTEGER DEFAULT 10 NOT NULL;",
                "ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS retention_days INTEGER DEFAULT 30 NOT NULL;",
                "ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS oauth_google_enabled BOOLEAN DEFAULT false NOT NULL;",
                "ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS oauth_google_client_id VARCHAR;",
                "ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS oauth_google_client_secret VARCHAR;",
                "ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS oauth_github_enabled BOOLEAN DEFAULT false NOT NULL;",
                "ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS oauth_github_client_id VARCHAR;",
                "ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS oauth_github_client_secret VARCHAR;",
            ]

            for stmt in statements:
                print(f"Executing: {stmt}")
                try:
                    cur.execute(stmt)
                except Exception as e:
                    print(f"Error executing {stmt}: {e}")
                    conn.rollback()
                    continue
                conn.commit()

            print("Successfully synced columns!")
except Exception as e:
    print(f"Connection error: {e}")
