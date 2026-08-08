# Execution Protocol

## Communication
- Code execution uses WebSocket over `/api/v1/execution/ws`.
- The backend handles concurrency by using a `SafeWebSocket` wrapper that acquires an `asyncio.Lock()` before writing to the socket, preventing JSON frame corruption.

## Message Types
- `stdout`, `stderr`: Standard output and error streams. Wrapped in JSON frames.
- `ping`: Heartbeat messages from the server to keep the connection alive.
- `error`: Execution or system errors.

## Cancellation
- The frontend initiates cancellation by sending a `{"type": "signal", "signal": "SIGKILL"}` payload over the WebSocket, then immediately closing the connection.
- The backend detects the disconnected WebSocket and force-kills the running Docker container (`container.remove(force=True)`).
- The `RuntimeManager` is completely decoupled from the REST API for cancellation, relying solely on WebSocket lifecycle.
