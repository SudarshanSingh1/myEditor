# Local Development Guide

This document outlines the workflow for developing the project locally.

## First Setup

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd myEditor
   ```
2. **Environment Variables**:
   - Copy the environment files for both root and backend.
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   ```
   - Update any necessary secrets (e.g., OAuth client IDs) if you need auth features locally.

3. **Start the environment**:
   ```bash
   docker compose up --build
   ```

## Docker Workflow

We use Docker Compose to spin up the entire stack locally:
- **api**: FastAPI backend on port 8000
- **frontend**: React Vite dev server on port 3000
- **db**: PostgreSQL 15 on port 5433 (mapped to 5432 internally)
- **proxy**: Nginx on port 8080 (main entry point)

**Access the app** via `http://localhost:8080`.

## Development Workflow

While Docker Compose is running, both frontend and backend use hot-reloading.

- **Frontend**: The Vite server inside the `frontend` container watches `app/` and automatically updates the UI.
- **Backend**: Uvicorn inside the `api` container watches `backend/` and reloads the API on file changes.

## Restart Workflow

If a service gets stuck or you change environment variables, restart the specific container:

```bash
# Restart backend
docker compose restart api

# Restart frontend
docker compose restart frontend
```

## Rebuild Workflow

You **must** rebuild containers when you:
- Add a new npm package (`package.json`)
- Add a new Python package (`requirements.txt`)
- Change a `Dockerfile`

```bash
docker compose up -d --build api
# or
docker compose up -d --build frontend
```

## Common Commands

**Frontend (Run outside docker for speed, if preferred):**
```bash
cd app
npm run dev        # Run locally without docker
npm run lint       # Run oxlint
npm run test       # Run vitest
npm run typecheck  # Run typescript compiler check
```

**Backend:**
```bash
cd backend
source venv/bin/activate
ruff check .       # Lint code
pytest             # Run tests
alembic upgrade head # Run migrations locally
```

## Local Debugging

- **Frontend Debugging**: Use React Developer Tools and standard Chrome DevTools. Check the Network tab to ensure requests to `:8080/api/...` are succeeding.
- **Backend Debugging**: Check Docker logs. For line-by-line debugging, you can run the FastAPI server outside of Docker using your IDE's debugger.

## Logs

To view logs for all services:
```bash
docker compose logs -f
```
To view logs for a specific service:
```bash
docker compose logs -f api
docker compose logs -f proxy
```

## Common Mistakes

1. **Accessing the wrong port**: Always use `http://localhost:8080` (Nginx proxy) to ensure CORS and routing work exactly like production. Do not hit `localhost:3000` or `localhost:8000` directly in the browser unless testing something specific.
2. **Missing Migrations**: If the backend throws 500 errors about missing tables, you forgot to run Alembic migrations. The `api` container usually runs them on startup, but you can manually run them if needed.
3. **Ghost Node Modules**: If the frontend fails to compile after installing a new package, run `docker compose build frontend` to update the container's volume.
