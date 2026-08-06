# Deployment Guide

This document outlines how myEditor moves from local code to a live production environment.

## Environments

### Local
Uses `docker-compose.yml`. Emphasizes developer experience with hot-reloading for Vite and FastAPI. Ports are mapped directly to localhost.

### Staging
A mirror of production, often deployed automatically from the `main` branch. Used for QA and final verification before a production release.

### Production
Uses `docker-compose.prod.yml`. Emphasizes security, performance, and stability.
- Vite dev server is gone. The frontend is built into static files and served by Nginx.
- Uvicorn runs with multiple worker processes.
- The `api` container must not mount local code; it uses the baked image.



Never commit `.env` to Git.
- **Local**: Managed manually via `.env` and `backend/.env`.
- **Production**: Managed by the production host's secret manager or a secure `.env` file injected at runtime.
Ensure variables like `SECRET_KEY`, database passwords, and OAuth secrets are strong and unique per environment.

## Docker Deployment

Production relies on pre-built images.
```bash
docker pull myregistry.com/myeditor/api:latest
docker pull myregistry.com/myeditor/frontend:latest
docker compose -f docker-compose.prod.yml up -d
```

## Reverse Proxy (Nginx)

Nginx is the sole entry point for production.
- Handles TLS (HTTPS) termination.
- Serves the static `/app/dist` files for the frontend.
- Proxies `/api/` to the FastAPI backend.
- Proxies WebSocket connections for the code execution terminal.

## Health Checks

Docker Compose is configured with health checks:
- **DB**: Runs `pg_isready`.
- **API**: Hits `/api/health`.
Traffic should not be routed to the API until the health check passes.

## Rollback

If a deployment fails:
1. Revert the Git commit and push to `main` to trigger a new CI build.
2. OR manually roll back the Docker images:
   ```bash
   # Revert to the previous stable tag
   docker compose -f docker-compose.prod.yml up -d myeditor/api:v1.0.4
   ```
3. If the database schema changed, follow the Alembic Rollback Strategy outlined in the Alembic Guide before reverting the API container.
