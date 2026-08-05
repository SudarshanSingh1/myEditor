import time
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request

logger = logging.getLogger("hamara.perf")

# Thresholds (seconds)
_SLOW_THRESHOLD = 0.5  # 500 ms — log a warning
_VERY_SLOW_THRESHOLD = 2.0  # 2 s   — log an error


class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        elapsed = time.perf_counter() - start

        response.headers["X-Process-Time"] = f"{elapsed:.4f}"

        if elapsed >= _VERY_SLOW_THRESHOLD:
            logger.error(
                "VERY_SLOW_REQUEST",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "elapsed_ms": round(elapsed * 1000),
                },
            )
        elif elapsed >= _SLOW_THRESHOLD:
            logger.warning(
                "SLOW_REQUEST",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "elapsed_ms": round(elapsed * 1000),
                },
            )

        return response
