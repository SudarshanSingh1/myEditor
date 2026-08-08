# SESSION & EXECUTION WORKFLOW AUDIT

## 1. Session Lifecycle & Tab Backgrounding (Phase 3 & 15)

### Current Architecture
- `AuthController.ts` handles JWT validation, token refresh, and deduplication of API requests via Promises (`bootstrapPromise`, `refreshPromise`).
- JWTs are stored securely in `HTTPOnly` cookies (`access_token`, `refresh_token`), with CSRF/CORS protections.
- Global API requests are routed through `fetchApi` in `app/lib/api.ts`, which attempts a `POST /auth/refresh` on a `401 Unauthorized`.

### Failure Modes Identified
1. **No Foreground Recovery:** There is no global listener for `visibilitychange` or `navigator.onLine`. When a tab goes into the background for 30+ minutes (or device sleeps), the OS suspends the JS event loop. The JWT expires.
2. **Race Condition on Return:** When the user switches back, the event loop resumes and fires pending React Query hooks (like `['workspace', projectId]`).
3. **"Failed to load workspace":** The `fetchApi` call fails with `401`, triggers a refresh, but the *original query* has already errored out. `FileExplorer.tsx` catches this and hard-renders `Failed to load workspace. {error}`. The UI gets stuck in an error state even if the background token refresh succeeds.

## 2. OS & Browser Detection (Phase 2 & 7)

### Current Architecture
- `backend/app/services/auth_service.py` uses the `user_agents` library to parse the `User-Agent` string.
- Device types are categorized into Mobile, Tablet, Bot, and Desktop (with a fallback logic for "Other").

### Issues Identified
- The frontend doesn't actively send client-side capabilities, but the backend implementation for parsing `User-Agent` is adequate.
- The `os` and `browser` fields are stored in `UserSession`, but this data is purely informative and isn't currently used for adaptive reconnect strategies.

## 3. Terminal WebSocket & "Ping" Leak (Phase 8 & 16)

### Current Architecture
- `TerminalPanel.tsx` maintains two WebSockets: `shellWsRef` and `execWsRef`.
- `backend/app/api/v1/execution_ws.py` handles the WebSocket connection.
- An `_heartbeat_loop` task is spawned that calls `await websocket.send_json({"type": "ping"})` every 30 seconds.
- In `container_manager.py`, `run_container_interactive` spawns a `read_from_docker` task that concurrently calls `await websocket.send_text(json.dumps({"type": "stdout", ...}))`.

### The "Ping" Leak Bug
- **Root Cause:** FastAPI (Starlette) WebSockets are **not thread-safe for concurrent writes** across different asyncio tasks.
- When `_heartbeat_loop` and `read_from_docker` both write to the socket simultaneously, the JSON frames overlap/corrupt on the wire (e.g., `{"type":"stdout","data":"..."}{"type":"ping"}`).
- The frontend `TerminalPanel.tsx` attempts `JSON.parse(event.data)`. Because the frame is corrupted, it throws an error.
- The `catch` block in the frontend acts as a fallback for raw strings:
  ```javascript
  catch {
    execOutputBuffer.current += event.data;
    term.write(event.data.replace(/\r?\n/g, '\r\n'));
  }
  ```
- This directly dumps the raw, overlapping JSON string (including `{"type":"ping"}`) into the visible terminal output.

## 4. Execution Performance (Phase 16)
- **Current Architecture:** Uses a warm pool strategy via `RuntimeManager`. Docker images are pre-pulled, but interactive execution spawns a new container via `client.containers.create`.
- **Bottlenecks:** The backend uses standard Docker SDK calls, which are reasonably fast, but WebSocket concurrency issues cause perceived instability.

## Conclusion & Next Steps
1. **Fix WS Concurrency:** Implement a thread-safe send queue or `asyncio.Lock()` in `execution_ws.py` to prevent overlapping JSON frames and fix the "ping" leak.
2. **Implement Visibility API:** Add a global `visibilitychange` listener in `App.tsx` or `AuthController.ts` that triggers an immediate health check / token refresh when the tab becomes active, *before* component queries fire.
3. **Graceful Query Recovery:** Update `fetchApi` or the React Query configuration to hold/retry queries during a token refresh rather than immediately failing and causing "Failed to load workspace" UI lockups.
