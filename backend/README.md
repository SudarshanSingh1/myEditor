# Hamara Editor Backend

This is the FastAPI backend for Hamara Editor.

## Tech Stack
- Python 3.13
- FastAPI
- SQLAlchemy 2.0 (Sync)
- Alembic
- PostgreSQL
- Docker

## Setup (Local without Docker)

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Setup environment variables:
   ```bash
   cp .env.example .env
   # Update .env with your database credentials
   ```

4. Run migrations:
   ```bash
   alembic upgrade head
   ```

5. Run the server:
   ```bash
   uvicorn app.main:app --reload
   ```

## Setup (Docker)

1. Build and run the containers:
   ```bash
   docker-compose up -d --build
   ```

2. The API will be available at `http://localhost:8000`.

3. Run migrations inside the container:
   ```bash
   docker-compose exec api alembic upgrade head
   ```

## Folder Structure

- `app/api`: API Routers and endpoints.
- `app/core`: Configuration, exceptions, and logging.
- `app/database`: DB connection and base class.
- `app/dependencies`: FastAPI dependencies (e.g., `get_db`).
- `app/middleware`: Custom middlewares.
- `app/models`: SQLAlchemy ORM models.
- `app/repositories`: Data access layer.
- `app/schemas`: Pydantic models for request/response.
- `app/services`: Business logic.
- `app/utils`: Helper functions.
- `tests`: Pytest suite.
- `alembic`: Database migrations.
