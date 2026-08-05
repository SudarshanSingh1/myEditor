import time
import json
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from app.core.logger import logger


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = getattr(request.state, "request_id", "unknown")
        start_time = time.time()

        # Log incoming request
        logger.info(
            json.dumps(
                {
                    "event": "request_started",
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "client_ip": request.client.host if request.client else None,
                }
            )
        )

        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            logger.info(
                json.dumps(
                    {
                        "event": "request_completed",
                        "request_id": request_id,
                        "method": request.method,
                        "path": request.url.path,
                        "status_code": response.status_code,
                        "latency_ms": round(process_time * 1000, 2),
                    }
                )
            )
            return response
        except Exception as e:
            process_time = time.time() - start_time
            logger.error(
                json.dumps(
                    {
                        "event": "request_failed",
                        "request_id": request_id,
                        "method": request.method,
                        "path": request.url.path,
                        "latency_ms": round(process_time * 1000, 2),
                        "error": str(e),
                    }
                )
            )
            raise
