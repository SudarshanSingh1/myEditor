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
    """
    FastAPI application lifespan.

    Startup sequence:
      1. Validate PostgreSQL enum synchronisation (fatal if mismatched).
      2. Start the cleanup background scheduler — exactly ONCE across all workers.
    """
    import asyncio
    import logging
    import fcntl
    import os
    from app.core.enum_validator import validate_db_enums
    from app.dependencies.database import SessionLocal

    _log = logging.getLogger("hamara.lifespan")

    # ── Step 1: Enum validation (fatal on mismatch) ──────────────────────────
    _log.info("Startup validation...")
    db = SessionLocal()
    try:
        validate_db_enums(db)
    except Exception as exc:
        _log.critical(
            f"Startup validation failed — enum validation error:\n"
            f"Reason: {exc}\n"
            f"Remediation: Check if Alembic migrations are applied and match the Python codebase. Run `alembic upgrade head`.",
            exc_info=True,
        )
        raise
    finally:
        db.close()

    # ── Step 2: Scheduler Singleton (cross-worker lock) ───────────────────────
    # Use an exclusive, non-blocking file lock.
    # The first worker to grab the lock becomes the singleton scheduler owner.
    # The lock is released automatically by the OS when the process exits.
    lock_file = "/tmp/hamara_scheduler.lock"
    lock_fd = None
    cleanup_task = None

    try:
        lock_fd = os.open(lock_file, os.O_CREAT | os.O_RDWR)
        fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)

        # We got the lock! Start the scheduler.
        from app.services.cleanup_service import cleanup_loop

        cleanup_task = asyncio.create_task(cleanup_loop())
        _log.info("Background scheduler started.")
    except (BlockingIOError, OSError):
        # Another worker already holds the lock.
        pass
    except Exception as exc:
        _log.error(f"[Lifespan] Failed to acquire scheduler lock: {exc}", exc_info=True)

    _log.info("Application startup complete.")

    yield  # ← application serves traffic here

    # ── Shutdown ──────────────────────────────────────────────────────────────
    if cleanup_task is not None:
        _log.info("[Lifespan] Cancelling cleanup scheduler...")
        cleanup_task.cancel()
        try:
            await cleanup_task
        except asyncio.CancelledError:
            pass
        _log.info("[Lifespan] Cleanup scheduler stopped.")

    if lock_fd is not None:
        try:
            fcntl.flock(lock_fd, fcntl.LOCK_UN)
            os.close(lock_fd)
        except OSError:
            pass


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
    ],
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Accept",
        "Accept-Language",
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "X-Request-ID",
    ],
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
