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

# Run database migrations
echo "Running database migrations..."
gosu appuser alembic upgrade head || echo "Warning: Alembic migrations failed. App might not start correctly."

# Seed database with initial permissions and data
echo "Seeding database..."
gosu appuser python scripts/seed_rbac.py || echo "Warning: Failed to seed RBAC permissions."
if [ -f "scripts/seed_analytics.py" ]; then
    gosu appuser python scripts/seed_analytics.py || echo "Warning: Failed to seed analytics."
fi

# Execute the main command dropping privileges to appuser
# Use gosu to properly step down from root
exec gosu appuser "$@"
