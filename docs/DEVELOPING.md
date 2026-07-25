# 💻 Developer & Contributor Guide

Welcome to the **Hamara Editor Developer Guide**! This document provides comprehensive instructions for setting up a local development environment, running unit tests, executing linter checks, and understanding the core architectural patterns of the project.

---

## 🛠️ Technology Stack

| Layer | Technologies & Tools |
| :--- | :--- |
| **Frontend UI** | React 19, TypeScript 5, Vite, Tailwind CSS / Custom Design System, Lucide Icons |
| **Editor & Terminal** | Monaco Editor (VS Code core), xterm.js, WebSockets |
| **Backend API** | Python 3.13, FastAPI, Uvicorn, Pydantic v2 |
| **Database & ORM** | PostgreSQL 15, SQLAlchemy 2.0 (Sync ORM), Alembic Migrations |
| **Code Execution** | Docker Engine API, Ephemeral Linux Sandbox Containers |
| **Quality & Testing** | Pytest, Ruff, ESLint, TypeScript Compiler (`tsc`) |

---

## 🚀 Setting Up Your Local Environment

### 1. Prerequisites
- **Node.js**: v20.0+ and `npm` v10.0+
- **Python**: v3.13+ (or Python 3.11+)
- **Docker**: Docker Engine running locally (required for testing sandbox code execution)
- **Git**: Installed and configured

---

### 2. Backend Development Setup

Navigate to the `backend/` directory and configure your Python environment:

```bash
cd backend

# Create isolated Python virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows PowerShell: .\venv\Scripts\Activate.ps1

# Install required packages and testing utilities
pip install --upgrade pip
pip install -r requirements.txt
```

#### Database Setup for Local Dev
You can spin up a local PostgreSQL instance using Docker:
```bash
docker run --name hamara-dev-db -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -e POSTGRES_DB=hamara_editor -p 5432:5432 -d postgres:15-alpine
```

Configure your local backend environment variables:
```bash
cp .env.example .env
```
Ensure your `.env` file contains:
```ini
DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/hamara_editor
SECRET_KEY=dev_secret_key_for_local_testing_only_12345
DEBUG=True
```

Run database migrations and seed RBAC roles:
```bash
alembic upgrade head
python scripts/seed_rbac.py
```

Start the FastAPI development server with hot-reload enabled:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- **API Server:** `http://localhost:8000`
- **Interactive Swagger Docs:** `http://localhost:8000/docs`
- **ReDoc Documentation:** `http://localhost:8000/redoc`

---

### 3. Frontend Development Setup

Open a new terminal session in the project root directory:

```bash
# Install Node.js package dependencies
npm install

# Start the Vite Hot Module Replacement (HMR) development server
npm run dev
```
- **Frontend App:** `http://localhost:5173`

> **Note on API Proxying:** During development, Vite automatically proxies `/api` and `/ws` requests to `http://localhost:8000` (as configured in `vite.config.ts`), eliminating CORS issues!

---

## 🧪 Testing & Quality Assurance

We maintain strict quality standards across both Frontend and Backend codebases. Please ensure all checks pass before submitting a Pull Request.

### Backend Testing & Linting

While inside the `backend/` directory with your virtual environment activated:

```bash
# Run automated test suite with Pytest
pytest tests/api/ -v

# Run specific test file or endpoint tests
pytest tests/api/test_admin.py -k security -v

# Check Python code formatting and lint rules using Ruff
ruff check .

# Automatically fix fixable Ruff linting issues
ruff check --fix .
```
> **How Test Databases Work:** Our test suite automatically uses an in-memory SQLite database (or dedicated test PostgreSQL schema via `TEST_DATABASE_URL` in `conftest.py`). It will never overwrite or clear your development database!

### Frontend Testing & Linting

While inside the project root directory:

```bash
# Check TypeScript type consistency across all components
npm run typecheck

# Run ESLint to catch React hooks or styling discrepancies
npm run lint

# Run Frontend unit tests (Vitest / Jest)
npm run test
```

---

## 🏛️ Codebase Architecture & Folder Structure

### Backend Architecture (`/backend`)
```
backend/
├── alembic/              # Database migration scripts and version history
├── app/
│   ├── api/              # Route handlers and API endpoints (v1/)
│   ├── core/             # Central configuration, security (JWT/OAuth), and exceptions
│   ├── database/         # SQLAlchemy SessionLocal and Base declarative class
│   ├── dependencies/     # FastAPI Dependency Injections (get_db, get_current_user, RBAC checks)
│   ├── middleware/       # Custom request/response middleware (CORS, Error Handlers)
│   ├── models/           # SQLAlchemy database tables (User, Project, Workspace, AuditLog, etc.)
│   ├── repositories/     # Data Access Layer (CRUD abstractions over database queries)
│   ├── schemas/          # Pydantic data models for request validation and response serializing
│   ├── services/         # Core business logic (ExecutionEngine, ProjectService, AuthService)
│   └── utils/            # Helper utilities (file manipulation, encryption, formatting)
├── scripts/              # Database seeders (seed_rbac.py, reset_password.py)
└── tests/                # Automated Pytest test suite
```

### Frontend Architecture (`/app` & `/public`)
```
app/
├── components/           # Reusable UI components (Modals, Navigation, Buttons, Tables)
├── context/              # React Context Providers (AuthContext, ThemeContext, WorkspaceContext)
├── hooks/                # Custom React Hooks (useAuth, useWebSocket, usePermissions)
├── pages/                # Application routes (IDE Workspace, Dashboard, Admin Panel, Settings)
├── services/             # Axios API client and backend endpoint wrapper methods
├── types/                # Shared TypeScript interface definitions
└── utils/                # Frontend helper utilities and styling class mixers (cn)
```

---

## 🔄 Adding a New Programming Language Sandbox

To support a new language in Hamara Editor:
1. Create a Docker runner image definition in `backend/app/services/runners/` (or update existing execution base images).
2. Register the file extension and compile/execute command commands in the execution orchestrator (`backend/app/services/execution_service.py`).
3. Add the language syntax highlighting support in the Frontend Monaco Editor configuration (`app/components/Editor/MonacoConfig.ts`).
4. Write a verification unit test in `backend/tests/api/test_execution.py`.
