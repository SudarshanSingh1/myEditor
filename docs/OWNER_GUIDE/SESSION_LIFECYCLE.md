# Session Lifecycle

## Authentication Recovery
- Handled at the network boundary using a centralized interceptor (`fetchApi` in `app/lib/api.ts`).
- Any 401 response triggers a single, synchronized refresh attempt via `AuthController.ts`.
- Concurrent 401s are deduplicated using a shared `Promise`.
- The original request is retried exactly once if the refresh succeeds.

## Browser Visibility and Offline States
- `window.addEventListener('visibilitychange')` and `window.addEventListener('online')` trigger `AuthController.checkSessionHealth()`.
- This ensures tokens are refreshed when the user returns to the tab after a long period of inactivity, before making new API calls.
- The editor state is preserved during this background refresh.

## WebSocket Authentication
- WebSocket connections authenticate via HTTP-only cookies.
- If the token is invalid, the connection is closed with a `1001` error.
- Reconnection attempts backoff exponentially.
