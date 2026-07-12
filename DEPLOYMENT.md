# Deployment Guide

Hamara Editor is designed for production deployment using Docker, Docker Compose, and GitHub Actions for continuous integration and delivery. This guide covers how to deploy the application in a production environment.

## Infrastructure Architecture

- **Frontend**: Served via Nginx (unprivileged) from a multi-stage Docker build.
- **Backend**: FastAPI running with Uvicorn/Gunicorn in a multi-stage Docker build (running as a non-root user).
- **Database**: PostgreSQL (can be self-hosted via Docker or managed like Neon/AWS RDS).
- **Execution Engine**: Code execution requires access to the Docker daemon. The backend mounts `/var/run/docker.sock` to spawn isolated, ephemeral containers for running user code safely.

## Prerequisites

- A server (e.g., Ubuntu 22.04 LTS) with at least 4GB RAM and 2 vCPUs.
- Docker and Docker Compose installed.
- Domain name configured with DNS pointing to your server.
- SSL certificates (e.g., via Let's Encrypt/Certbot).
- GitHub repository with GitHub Actions enabled.

## Environment Configuration

You must provide a `.env.production` file for the backend and frontend configurations.

```ini
# .env.production

# Backend
ENVIRONMENT=production
HOST=0.0.0.0
PORT=8000
DATABASE_URL=postgresql://user:password@db_host:5432/hamara_editor
JWT_SECRET_KEY=your_very_secure_long_random_string
JWT_REFRESH_SECRET_KEY=another_secure_random_string
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Execution Settings
MAX_EXECUTION_TIME_SECONDS=5
MAX_EXECUTION_MEMORY_MB=256

# SMTP (Emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
FRONTEND_URL=https://yourdomain.com
```

## Continuous Deployment (CI/CD)

The repository uses GitHub Actions for an automated CI/CD pipeline:
1. **CI Pipeline** (`.github/workflows/ci.yml`): Runs on every push and PR. Executes frontend linting and testing, and backend Ruff linting, Black formatting, Bandit security checks, and Pytest suites.
2. **CD Pipeline** (`.github/workflows/cd.yml`): Runs on pushes to the `main` branch. Builds the Docker images, pushes them to GitHub Container Registry (`ghcr.io`), and triggers the deployment script on your remote server via SSH.

### GitHub Secrets for CD
Ensure the following secrets are configured in your repository settings:
- `PROD_HOST`: The IP address or domain of your production server.
- `PROD_USERNAME`: SSH username (e.g., `ubuntu`).
- `PROD_SSH_KEY`: Private SSH key for accessing the server.

## Manual Deployment

You can use the provided shell scripts for manual deployment and rollback on the production server.

### Deploying

The deployment script automatically pulls the latest images, runs database migrations, and restarts the containers.

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### Rolling Back

If a deployment fails, you can roll back to a specific Git commit hash:

```bash
chmod +x scripts/rollback.sh
./scripts/rollback.sh <git-commit-hash>
```

## Maintenance and Diagnostics

### Checking Health
The API exposes health check endpoints for Kubernetes and load balancers:
- **Liveness**: `GET /api/v1/health/live`
- **Readiness**: `GET /api/v1/health/ready`
- **Full Health Check**: `GET /api/v1/health/health`

### Verifying Database Migrations
To check if the database schema is in sync with the SQLAlchemy models:
```bash
python3 backend/scripts/check_migrations.py
```

### Viewing Logs
To view the production logs for the backend API:
```bash
docker compose -f docker-compose.prod.yml logs -f api
```

### Security Considerations

- **Non-Root Containers**: Both frontend and backend Dockerfiles are optimized to run as non-root users.
- **Docker Socket**: The backend requires access to `/var/run/docker.sock` to execute user code. Ensure the host system restricts access to this socket appropriately.
- **Rate Limiting**: Production API routes are protected by rate limiters to prevent abuse.
