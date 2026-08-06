# Debugging Guide

When things break, follow this guide to isolate and fix the issue.

## Backend Debugging (FastAPI)
- **Check Logs**: `docker compose logs -f api`
- **Interactive Debugger**: If you need to step through code, stop the Docker container and run FastAPI locally via your IDE's debugger (`uvicorn app.main:app --reload`).
- **Tracebacks**: Look for the exact line in `app/services/` or `app/api/` that triggered the 500 error.

## Frontend Debugging (React)
- **React DevTools**: Inspect component state and props.
- **Network Tab**: Ensure the API request is exactly what you expect, and check the JSON response.
- **Console**: Look for React warnings (like missing keys) or unhandled promise rejections.

## Docker Debugging
- **Exec into container**: `docker exec -it myeditor-api-1 bash` to verify files are mounted correctly.
- **Rebuild Cache**: If code isn't updating, run `docker compose build --no-cache`.

## Database Debugging (PostgreSQL)
- **Connect**: `docker exec -it myeditor-db-1 psql -U hamara_user -d hamara_db`
- **Check Connections**: `SELECT count(*) FROM pg_stat_activity;` if the backend says "too many connections".

## Alembic Debugging
- If a migration says "table already exists", someone modified the database directly without Alembic. Drop the table manually or adjust the migration.
- Always check `SELECT * FROM alembic_version;` to see what Alembic thinks the current state is.

## Authentication Debugging
- If you can't log in, check the Application tab in Chrome DevTools. Are the `HttpOnly` cookies set?
- If cookies are set but API calls return 401, check the Network tab. Are the cookies being sent? If not, check CORS or the proxy configuration (`nginx.conf`).

## Execution Debugging
- If code execution fails silently, check the API logs: `docker compose logs api`. Look for Docker socket permission errors.
- If it times out instantly, the runner image might be missing.
- To see dangling containers: `docker ps -a | grep myeditor`

## Websocket Debugging
- Open Chrome DevTools -> Network -> WS (WebSockets).
- Click the connection and view the "Messages" tab. You can see exactly what frames the frontend is sending (code input) and what the backend is returning (execution output).

## Production Debugging
- **NEVER** turn on debug mode in production.
- Rely on APM (Sentry) for stack traces.
- Connect to the production database via a read-replica if possible, never run heavy analytical queries on the primary DB while debugging.
