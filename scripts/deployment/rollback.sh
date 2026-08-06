#!/bin/bash
set -e

if [ -z "$1" ]; then
    echo "Usage: ./scripts/rollback.sh <git-commit-hash>"
    echo "Example: ./scripts/rollback.sh abc123def"
    exit 1
fi

COMMIT_HASH=$1

echo "Rolling back to commit $COMMIT_HASH..."

# 1. Update .env or docker-compose to use the specific image tags if they are tagged by commit hash
# For simplicity, assuming the tags are updated in the env or pulled manually:

export IMAGE_TAG=$COMMIT_HASH

echo "Pulling images for tag $IMAGE_TAG..."
docker compose -f docker-compose.prod.yml pull

# Note: Database rollback is complex and often skipped in simple rollbacks unless 
# explicitly needed. Alembic downgrade requires the old code.
# To downgrade DB:
# docker compose -f docker-compose.prod.yml run --rm api alembic downgrade -1

# 3. Start or Update Services with the rolled back images
echo "Starting services with rollback images..."
docker compose -f docker-compose.prod.yml up -d

echo "Rollback to $COMMIT_HASH completed!"
