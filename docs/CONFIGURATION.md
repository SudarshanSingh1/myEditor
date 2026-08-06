# Configuration Reference

Hamara Editor relies on several configuration files. This document explains what they do and where they are located.

## Docker (`docker-compose.yml`)
- Defines the local development topology (API, Frontend, Proxy, DB).
- Uses named volumes (`pgdata`) to persist data across container restarts.
- The `api` container explicitly mounts `/var/run/docker.sock` to enable the Execution Engine.

## Alembic (`backend/alembic.ini` & `backend/alembic/env.py`)
- Configures how database migrations are generated and applied.
- `alembic.ini` defines the database URL (usually overridden by environment variables).
- `env.py` loads the SQLAlchemy models so Alembic can diff the code against the live database.

## FastAPI (`backend/app/core/config.py`)
- Reads environment variables via Pydantic `BaseSettings`.
- Defines CORS origins, database URLs, and OAuth secrets.

## React & Vite (`package.json` & `vite.config.ts`)
- `package.json` defines dependencies, scripts, and basic project metadata.
- `vite.config.ts` configures the Vite bundler. It handles aliases, React plugins, and proxying API requests during local development (if not using Nginx).

## TypeScript (`tsconfig.json`)
- Configures strict typing rules for the frontend.
- `tsconfig.app.json` is for browser code.
- `tsconfig.node.json` is for Vite configuration.

## Linting and Formatting
- **ESLint/Oxlint**: Analyzes JavaScript/TypeScript for common errors (`.oxlintrc.json`).
- **Prettier**: (If installed) formats frontend code to a consistent style.
- **Ruff**: Extremely fast Python linter and formatter (`backend/ruff.toml` or `pyproject.toml`). It replaces flake8, black, and isort.
