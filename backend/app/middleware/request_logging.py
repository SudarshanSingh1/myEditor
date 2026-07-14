import time
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from app.core.logger import logger

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = getattr(request.state, "request_id", "unknown")
        
        logger.info(f"Request started: {request.method} {request.url.path} - ID: {request_id}")
        
        start_time = time.time()
        
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            logger.info(
                f"Request completed: {request.method} {request.url.path} "
                f"- Status: {response.status_code} "
                f"- Time: {process_time:.4f}s - ID: {request_id}"
            )
            return response
        except Exception as e:
            process_time = time.time() - start_time
            logger.error(
                f"Request failed: {request.method} {request.url.path} "
                f"- Error: {str(e)} "
                f"- Time: {process_time:.4f}s - ID: {request_id}"
            )
            raise
