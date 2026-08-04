#!/bin/sh
set -e

# If the docker socket exists, ensure appuser has access
if [ -S /var/run/docker.sock ]; then
    # Get the group ID of the docker socket
    DOCKER_GID=$(stat -c '%g' /var/run/docker.sock)
    
    # Check if a group with this GID already exists
    if ! getent group "$DOCKER_GID" >/dev/null; then
        # Create a group for this GID
        groupadd -g "$DOCKER_GID" docker_host_group
    fi
    
    # Get the group name (whether it already existed or we just created it)
    DOCKER_GROUP=$(getent group "$DOCKER_GID" | cut -d: -f1)
    
    # Add appuser to the group
    usermod -aG "$DOCKER_GROUP" appuser
fi

# Wait for database using Python and SQLAlchemy
echo "Waiting for database..."
python -c '
import sys, time, os
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError

url = os.getenv("DATABASE_URL")
if not url:
    print("No DATABASE_URL provided. Skipping database wait.")
    sys.exit(0)

engine = create_engine(url)
for _ in range(30):
    try:
        with engine.connect() as conn:
            pass
        print("Database ready.")
        sys.exit(0)
    except Exception:
        time.sleep(1)

print("CRITICAL: Database failed to become ready in 30 seconds.")
sys.exit(1)
' || exit 1

# Run database migrations
echo "Running migrations..."
gosu appuser alembic upgrade head || { echo "CRITICAL: Alembic migrations failed. Exiting to prevent starting against an outdated schema."; exit 1; }

# Seed database with initial permissions and data
echo "Running seeders..."
gosu appuser python scripts/seed_rbac.py || { echo "CRITICAL: Failed to seed RBAC permissions. Exiting."; exit 1; }
if [ -f "scripts/seed_analytics.py" ] && [ "$APP_ENV" = "development" ]; then
    echo "Running in development mode: Seeding analytics..."
    gosu appuser python scripts/seed_analytics.py || { echo "CRITICAL: Failed to seed analytics. Exiting."; exit 1; }
fi


# Execute the main command dropping privileges to appuser
# Use gosu to properly step down from root
exec gosu appuser "$@"
