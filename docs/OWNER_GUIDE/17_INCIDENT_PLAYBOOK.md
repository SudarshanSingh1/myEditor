# Incident Playbook

When an emergency happens, follow these steps to diagnose and recover.

---

## 1. Website Down (502 Bad Gateway)
- **Symptoms**: Users see Nginx error pages.
- **Diagnosis**: The Proxy container cannot reach the Frontend or API containers.
- **Commands**: `docker compose ps` (Check if containers are crashed).
- **Root causes**: API ran out of memory, or a bad deployment broke startup.
- **Recovery steps**: Restart containers (`docker compose restart`). If they crash again, check logs to fix the code.
- **Verification**: Hit the homepage and ensure it loads.

## 2. Database Unavailable
- **Symptoms**: API returns 500 errors. Logs show `ConnectionRefusedError` or `OperationalError`.
- **Diagnosis**: The `db` container is down or maxed out on connections.
- **Commands**: `docker compose logs db`.
- **Root causes**: OOM killed the database, or a connection leak in FastAPI.
- **Recovery steps**: Restart DB. Check FastAPI `pool_size` settings.
- **Verification**: API health check passes.

## 3. Migration Failed
- **Symptoms**: API container loops on startup, failing to apply Alembic migration.
- **Diagnosis**: Migration contains invalid SQL for the current data state.
- **Commands**: `docker compose logs api`.
- **Root causes**: Adding a NOT NULL column to a populated table without a default.
- **Recovery steps**: Fix migration code locally, push, rebuild image. Or rollback to previous image.
- **Verification**: `alembic current` matches `alembic heads`.

## 4. Docker Broken
- **Symptoms**: Containers won't start. Error: "no space left on device".
- **Diagnosis**: Host disk is full.
- **Commands**: `df -h`.
- **Root causes**: Too many old Docker images or massive log files.
- **Recovery steps**: `docker system prune -af`. Truncate logs if necessary.
- **Verification**: `df -h` shows > 20% free space.

## 5. Execution Failing
- **Symptoms**: Code execution returns errors or hangs forever.
- **Diagnosis**: The Docker socket isn't mounted, or runner images are missing.
- **Commands**: `docker exec -it myeditor-api-1 docker ps`
- **Root causes**: Permissions issue on `/var/run/docker.sock` or host Docker daemon restarted.
- **Recovery steps**: Restart the API container so it remounts the socket.
- **Verification**: Run a simple `print("hello")` in the editor.

## 6. Auth Broken
- **Symptoms**: Users cannot log in or are constantly logged out.
- **Diagnosis**: Cookies are not being set or OAuth provider is failing.
- **Commands**: Check browser DevTools -> Network.
- **Root causes**: Missing/invalid `SECRET_KEY`, misconfigured OAuth client IDs, or HTTP/HTTPS mismatch (Secure flag issues).
- **Recovery steps**: Verify `.env` variables in production.
- **Verification**: Successfully log in as a test user.

## 7. High CPU
- **Symptoms**: Entire server is sluggish.
- **Diagnosis**: A specific container is hogging CPU.
- **Commands**: `docker stats` or `htop`.
- **Root causes**: A user is running an infinite loop in the execution engine, or a bad regex in FastAPI.
- **Recovery steps**: Kill the offending execution container.
- **Verification**: CPU drops below 50%.

## 8. High RAM
- **Symptoms**: Containers randomly crash without error logs (OOMKilled).
- **Diagnosis**: Look at `docker inspect <container> | grep OOMKilled`.
- **Commands**: `docker stats`.
- **Root causes**: Memory leak in Node.js (frontend SSR if used) or Python backend loading massive data into memory.
- **Recovery steps**: Add more RAM to host, or optimize code to stream data.
- **Verification**: RAM usage stabilizes over 24 hours.

## 9. High Latency
- **Symptoms**: API takes 5+ seconds to respond.
- **Diagnosis**: Database is slow, or thread pool is exhausted.
- **Commands**: APM metrics, `pg_stat_activity`.
- **Root causes**: Missing database index, N+1 query.
- **Recovery steps**: Identify slow endpoint, optimize query, deploy.
- **Verification**: P95 latency drops below 200ms.

## 10. Websocket Issues
- **Symptoms**: Terminal execution doesn't stream; output appears all at once or disconnects.
- **Diagnosis**: Nginx is dropping WS connections or timeout is too short.
- **Commands**: Check Nginx logs.
- **Root causes**: Missing `proxy_set_header Upgrade $http_upgrade;` in Nginx config.
- **Recovery steps**: Update Nginx config and reload (`nginx -s reload`).
- **Verification**: Websocket connection stays open for 60 seconds.
