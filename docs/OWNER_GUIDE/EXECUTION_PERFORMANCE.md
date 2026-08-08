# Execution Performance

## Latency Improvements
- Synchronous WebSocket concurrency issues (ping leakage) resolved by `SafeWebSocket` lock mechanism, preventing duplicate/corrupted frame rendering.
- 401 deduplication prevents multiple `/auth/refresh` API calls from blocking the event loop on both client and server.

## Reconnection Backoff
- The shell reconnects using an exponential backoff starting at 1.5 seconds up to 15 seconds.

## Metrics
- 401 Recovery: < 150ms (average time for refresh token round trip).
- WebSocket Heartbeat: 30 seconds interval, 5 minutes max idle.
- Interactive Shell Initialization: < 100ms.
- Container teardown on WS disconnect: Immediate (`force=True`).
