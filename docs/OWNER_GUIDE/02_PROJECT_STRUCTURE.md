# Project Structure

Understanding where code belongs is critical to maintaining a clean architecture.

## `app/` (Frontend)
Contains the React 19 application built with Vite.
- `components/`: Reusable UI elements (buttons, modals, dialogs). Must not contain business logic.
- `hooks/`: Custom React hooks, especially for React Query data fetching.
- `layouts/`: Page wrappers (e.g., SidebarLayout, AuthLayout).
- `pages/` (or `routes/`): React Router route components. These should be thin wrappers connecting data to components.
- `stores/`: Zustand global state management.
- `services/`: API client calls (Axios/Fetch wrappers) talking to the backend.
- `lib/`: Utility functions and third-party wrappers.

## `backend/` (API)
Contains the FastAPI Python application.
- `app/api/`: API routers grouped by feature (e.g., `users.py`, `projects.py`).
- `app/core/`: Application configuration, security logic, and constants.
- `app/database/`: Database session management and dependency injection.
- `app/models/`: SQLAlchemy ORM classes. These define the database tables.
- `app/schemas/`: Pydantic models for request validation and response serialization.
- `app/services/`: Core business logic. API endpoints should call services, not implement logic themselves.
- `app/repositories/`: Data access layer. Complex SQL queries go here.
- `app/execution/`: The code execution engine logic (Docker orchestration, language configs).
- `alembic/`: Database migration scripts.

## `docker/`
Contains any specialized Dockerfiles or entrypoint scripts that are too complex for the root directory. (Note: standard Dockerfiles currently live in the root and `backend/` directories).

## `scripts/`
Utility scripts for CI/CD, database seeding, backup operations, and local environment setup.

## `docs/`
Contains project documentation. The `OWNER_GUIDE/` is specifically for architectural and operational guidelines.

---

## Where new code belongs

### Adding a new UI Page
1. Create the API endpoint in `backend/app/api/`.
2. Add the API fetcher to `app/services/`.
3. Create a React Query hook in `app/hooks/`.
4. Build the UI components in `app/components/`.
5. Assemble the page in `app/routes/` and update `react-router.config.ts`.

### Adding a new Database Table
1. Define the SQLAlchemy model in `backend/app/models/`.
2. Generate an Alembic migration in `backend/alembic/versions/`.
3. Create Pydantic schemas in `backend/app/schemas/`.
4. Create CRUD operations in `backend/app/repositories/`.
5. Expose via a Service and Router.

## Where NOT to put code

- **NO business logic in Frontend Components**: UI components should only concern themselves with rendering state and emitting events.
- **NO SQL in API Routers**: API routers should only validate HTTP requests and pass them to Services.
- **NO Direct DB calls from Services**: Services should use Repositories to fetch/save data.
- **NO Hardcoded strings/secrets**: Put them in `.env` and load them via `backend/app/core/config.py` or Vite environment variables.
