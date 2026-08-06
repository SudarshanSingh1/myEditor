# Docker Guide

This project relies heavily on Docker for local development, code execution, and production deployment.

## Container Architecture

The `docker-compose.yml` defines the following stack:
1. **api**: The FastAPI Python backend (built via `backend/Dockerfile`).
2. **frontend**: The React/Vite development server (built via `Dockerfile.frontend`).
3. **proxy**: Nginx router that directs traffic to the correct container.
4. **db**: PostgreSQL 15 database.

*Note: The `api` container also has access to the host's Docker socket (`/var/run/docker.sock`) to spawn ephemeral code execution containers.*

## Volumes

- **pgdata**: A persistent named volume for PostgreSQL data. This survives container restarts and destruction.
- **Bind Mounts**: Local development uses bind mounts (`./backend:/app` implicitly or via Vite's watch) so that local code changes reflect immediately inside the containers.
- **Docker Socket**: The `/var/run/docker.sock` volume on the `api` container allows it to use the host's Docker daemon.

## Networks

Docker Compose automatically creates a default bridge network. All containers communicate using their service names (e.g., the backend connects to the database via `postgres://hamara_user:hamara_password@db:5432/hamara_db`).

## Images

- `api` is built from python:3-slim or similar.
- `frontend` is built from node:20-alpine.
- `proxy` uses `nginx:alpine`.
- `db` uses `postgres:15-alpine`.

## Rebuild Rules

### When `docker compose up` is enough
- Changing Python code in `backend/` (FastAPI reloads).
- Changing React/TS code in `app/` (Vite HMR).
- Changing environment variables (sometimes requires restarting the specific container, but not rebuilding).

### When `--build` is required
Run `docker compose up -d --build <service>` when:
- You modify `package.json` and need to install new npm packages.
- You modify `requirements.txt` and need to install new pip packages.
- You modify a `Dockerfile`.

## Volume Removal

If your database is completely broken and you need a fresh start (Local Dev Only):
```bash
docker compose down -v
# This DESTROYS the pgdata volume. All local users and data will be lost.
```

## Difference between Image and Volume
- **Image**: The static blueprint of the container (OS + installed packages).
- **Volume**: The persistent storage attached to the container (Database files).

## Container Debugging

- **Logs**: `docker compose logs -f api`
- **Shell Access**: `docker exec -it myeditor-api-1 bash` (or `sh`)
- **Inspect**: `docker inspect myeditor-api-1`

## Cleaning Docker Safely

If your Docker is using too much disk space:
```bash
# Removes stopped containers, unused networks, dangling images, and build cache
docker system prune

# Removes EVERYTHING not currently running, including all stopped volumes
docker system prune -a --volumes
```

## Production Notes
Production uses `docker-compose.prod.yml`.
- The frontend is served statically by Nginx (no Vite dev server).
- The API does not use reload mode.
- Bind mounts for source code are removed; code is baked into the image.
