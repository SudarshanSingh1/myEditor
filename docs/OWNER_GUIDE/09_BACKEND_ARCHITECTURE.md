# Backend Architecture

The backend is built with FastAPI and follows a layered architecture to separate concerns.

## FastAPI

FastAPI provides the web framework, automatic OpenAPI documentation (Swagger), and Pydantic integration.
- The entry point is `backend/app/main.py`.
- Nginx proxies requests to Uvicorn running the FastAPI app.

## Routers (`app/api/`)

Routers define the HTTP endpoints (`@router.get`, `@router.post`).
**Rules:**
- They must be thin.
- They are responsible for HTTP parsing, injecting dependencies, calling a Service, and returning an HTTP response.
- **No business logic or SQL queries belong here.**

## Services (`app/services/`)

Services contain the core business logic.
**Rules:**
- They receive validated data (Pydantic schemas) from Routers.
- They enforce business rules (e.g., "Can this user execute code?").
- They call Repositories to interact with the database.
- They do not know about HTTP requests or responses.

## Repositories (`app/repositories/`)

Repositories encapsulate all database interactions using SQLAlchemy.
**Rules:**
- This is the ONLY place where `db.query()` or `session.execute()` should be used.
- They return SQLAlchemy Models to the Services.

## Schemas (`app/schemas/`)

Pydantic models used for data validation.
- Separated into `Create`, `Update`, `Response` models.
- e.g., `UserCreate` (requires password), `UserResponse` (hides password).

## Models (`app/models/`)

SQLAlchemy classes that represent database tables.
- Changes here require Alembic migrations.

## Dependency Injection

FastAPI's `Depends()` is heavily used for:
- Database sessions (`get_db`).
- Authentication (`get_current_user`).
This makes testing easy, as dependencies can be overridden in `pytest`.

## Background Tasks

FastAPI's `BackgroundTasks` are used for tasks that shouldn't block the HTTP response.
- e.g., Sending welcome emails, cleaning up execution containers, tracking metrics.
- Keep background tasks lightweight. For heavy processing, use a real task queue.

## Validation

Validation happens automatically via Pydantic at the Router level. Do not manually validate standard data types or lengths in the Service layer if Pydantic can do it via `Field(..., max_length=100)`.

## Business Logic Rules

1. **Isolation**: A Service should not call another Service's Repository directly. It should call the other Service.
2. **Exceptions**: Services should raise custom Python exceptions (e.g., `ResourceNotFoundError`). Routers catch these and convert them to `HTTPException(status_code=404)`.
