import psycopg
import sys

try:
    with psycopg.connect("host=localhost port=5432 dbname=hamara_db user=hamara_user password=hamara_password") as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT version_num FROM alembic_version;")
            print("Current Alembic Version(s):", cur.fetchall())
except Exception as e:
    print("Error:", e)
