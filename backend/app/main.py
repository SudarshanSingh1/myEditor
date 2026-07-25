from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.rate_limit import limiter
from app.core.config import settings
from app.core.exception_handlers import setup_exception_handlers
from app.middleware.request_id import RequestIDMiddleware
from app.middleware.request_logging import LoggingMiddleware
from app.middleware.response_timing import TimingMiddleware
from app.middleware.maintenance import MaintenanceMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.api.v1.router import router as api_v1_router
from app.api.v1 import health
from app.schemas.responses import SuccessResponse

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    yield
    # Shutdown logic

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Hamara Editor Backend API",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# Setup Exception Handlers
setup_exception_handlers(app)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Middlewares (Executed bottom to top)
app.add_middleware(MaintenanceMiddleware)
app.add_middleware(LoggingMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(TimingMiddleware)
app.add_middleware(RequestIDMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=1000)
from urllib.parse import urlparse
frontend_host = urlparse(settings.FRONTEND_URL).hostname or "localhost"

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[
        urlparse(settings.FRONTEND_URL).hostname or "localhost",
        "localhost",
        "127.0.0.1",
        "testserver",
        "*.testserver",
        "*",
    ]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Accept", "Accept-Language", "Content-Language", "Content-Type", "Authorization", "X-Requested-With", "X-Request-ID"],
)

# Routes
app.include_router(health.router, prefix="/api")
app.include_router(api_v1_router, prefix="/api/v1")

@app.get("/", response_model=SuccessResponse[dict])
async def root():
    return SuccessResponse(message="Hamara Editor API", data={})

@app.get("/health", response_model=SuccessResponse[dict])
async def health_check():
    return SuccessResponse(message="API is healthy", data={"status": "healthy"})
