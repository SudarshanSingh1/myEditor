# Project Overview

Welcome to the internal engineering handbook for **myEditor**. This document provides a high-level understanding of how the system is put together.

## High-Level Architecture

The project follows a standard three-tier architecture with a specialized code execution engine.

1. **Frontend Client**: A modern Single Page Application (SPA) built with React 19, React Router 7, and Vite.
2. **Reverse Proxy**: Nginx routing traffic to either the Frontend or Backend based on the path.
3. **Backend API**: A FastAPI python application responsible for business logic, authentication, and orchestrating code execution.
4. **Database**: A PostgreSQL 15 database storing user data, project state, and metadata.
5. **Execution Engine**: A specialized component running inside the backend that spawns isolated Docker containers to execute user code in various programming languages.

## Tech Stack

### Frontend
- **Framework**: React 19, React Router 7
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand
- **Data Fetching**: React Query (@tanstack/react-query)
- **Editor**: Monaco Editor, xterm.js for terminal UI

### Backend
- **Framework**: FastAPI (Python)
- **ORM**: SQLAlchemy
- **Migrations**: Alembic
- **Testing**: Pytest
- **Linting/Formatting**: Ruff

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database**: PostgreSQL 15
- **Proxy**: Nginx

## Folder Structure

```text
myEditor/
├── app/                  # Frontend application (React/Vite)
├── backend/              # Backend application (FastAPI)
│   ├── alembic/          # Database migrations
│   ├── app/              # Backend source code
│   └── tests/            # Backend tests
├── docs/                 # Documentation (this handbook)
├── scripts/              # Utility and deployment scripts
├── docker-compose.yml    # Development environment
└── nginx.conf            # Reverse proxy configuration
```

## Request Flow

1. **User Action**: The user interacts with the Monaco editor or terminal in the UI.
2. **Proxy Routing**: The request hits Nginx (`localhost:8080`).
   - If `/api/*`, Nginx routes it to the FastAPI backend (`localhost:8000`).
   - If `/`, Nginx routes it to the React frontend (`localhost:3000`).
3. **Backend Processing**: FastAPI receives the request, validates the JWT, processes business logic, and interacts with PostgreSQL.
4. **Response**: JSON payload is returned to the React Query hook on the frontend, updating the UI.

## Authentication Flow

Authentication uses HTTP-only cookies to secure JWTs and OAuth for identity provision.

1. User clicks "Login with Google/GitHub".
2. Backend validates OAuth credentials with the provider.
3. Backend creates (or updates) a user record in PostgreSQL.
4. Backend issues an **Access Token** and a **Refresh Token**, both set as secure, HTTP-Only cookies.
5. Frontend relies on a `/api/users/me` endpoint to read user state—it never reads the token directly.
6. Upon token expiration, the backend automatically attempts to refresh the access token using the refresh token cookie.

## Execution Flow

The Execution Engine is a critical component for running user code safely.

1. Frontend sends a code payload and execution environment request to the backend.
2. The `backend/app/execution` module intercepts the request.
3. The engine spins up an ephemeral Docker container for the specific language runtime (e.g., Python, Node.js).
4. The code is injected into the container via volume mounts or stdin.
5. Execution output (stdout, stderr) is captured or streamed back via WebSockets to xterm.js in the frontend.
6. The container is immediately destroyed upon completion or timeout.

## Deployment Flow

1. **Continuous Integration**: GitHub Actions run linting (Oxlint, Ruff) and tests (Vitest, Pytest) on every PR.
2. **Build**: Docker images are built for `api` and `frontend`.
3. **Staging/Production**: 
   - Uses `docker-compose.prod.yml`.
   - Nginx handles TLS termination and traffic routing.
   - Database migrations are run automatically during the backend container startup or via CI deployment scripts.
