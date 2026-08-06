#!/bin/bash
set -e

echo "Starting Deployment..."

# 1. Pull latest images
docker compose -f docker-compose.prod.yml pull

# 2. Run Database Migrations
echo "Running database migrations..."
docker compose -f docker-compose.prod.yml run --rm api alembic upgrade head

# 3. Start or Update Services
echo "Starting services..."
docker compose -f docker-compose.prod.yml up -d

# 4. Clean up old images
echo "Cleaning up dangling images..."
docker image prune -f

echo "Deployment completed successfully!"
