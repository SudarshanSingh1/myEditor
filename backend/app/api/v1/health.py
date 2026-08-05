from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.dependencies.database import get_db
from app.schemas.responses import SuccessResponse
import docker
import os
import time
import psutil

from fastapi import HTTPException

router = APIRouter()

# Record startup time for uptime metric
_START_TIME = time.time()


@router.get("/live")
def liveness_check():
    return {"status": "ok"}


@router.get("/ready")
def readiness_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception:
        raise HTTPException(status_code=503, detail="Database not ready")


@router.get("/health", response_model=SuccessResponse[dict])
def check_health(db: Session = Depends(get_db)):
    health_status = {"database": "unreachable", "docker": "unreachable"}

    try:
        db.execute(text("SELECT 1"))
        health_status["database"] = "healthy"
    except Exception:
        pass

    try:
        client = docker.from_env()
        client.ping()
        health_status["docker"] = "healthy"
    except Exception:
        pass

    overall = (
        "healthy"
        if health_status["database"] == "healthy"
        and health_status["docker"] == "healthy"
        else "degraded"
    )

    return SuccessResponse(message=f"System is {overall}", data=health_status)


@router.get("/version", response_model=SuccessResponse[dict])
def get_version():
    return SuccessResponse(
        message="Version retrieved",
        data={
            "api_version": "1.0.0",
            "backend_version": "1.0.0-rc1",
            "frontend_version": "1.0.0-rc1",
            "build_number": os.environ.get("BUILD_NUMBER", "dev"),
        },
    )


@router.get("/status", response_model=SuccessResponse[dict])
def get_status(db: Session = Depends(get_db)):
    health = check_health(db)
    ver = get_version()
    from app.models.system_settings import SystemSettings

    settings_obj = db.query(SystemSettings).first()
    maintenance_mode = settings_obj.maintenance_mode if settings_obj else False
    maintenance_message = (
        settings_obj.maintenance_message
        if settings_obj and getattr(settings_obj, "maintenance_message", None)
        else "System is under maintenance."
    )

    return SuccessResponse(
        message="Status retrieved",
        data={
            "health": health.data,
            "versions": ver.data,
            "maintenance_mode": maintenance_mode,
            "maintenance_message": maintenance_message,
        },
    )


@router.get("/metrics", response_class=PlainTextResponse, include_in_schema=False)
def prometheus_metrics(db: Session = Depends(get_db)):
    """Prometheus-compatible text format metrics.

    Scraped by Prometheus / Grafana without any external library.
    Endpoint is excluded from OpenAPI docs (internal use only).
    """
    proc = psutil.Process(os.getpid())
    mem = proc.memory_info()
    uptime_seconds = time.time() - _START_TIME

    # DB pool stats from SQLAlchemy engine
    from app.database.session import engine

    pool = engine.pool
    pool_size = getattr(pool, "size", lambda: 0)()
    pool_checked_in = getattr(pool, "checkedin", lambda: 0)()
    pool_checked_out = getattr(pool, "checkedout", lambda: 0)()
    pool_overflow = getattr(pool, "overflow", lambda: 0)()

    # DB ping latency
    db_ok = 0
    try:
        db.execute(text("SELECT 1"))
        db_ok = 1
    except Exception:
        pass

    lines = [
        "# HELP hamara_uptime_seconds Seconds since process started",
        "# TYPE hamara_uptime_seconds gauge",
        f"hamara_uptime_seconds {uptime_seconds:.2f}",
        "# HELP hamara_process_rss_bytes Resident set size in bytes",
        "# TYPE hamara_process_rss_bytes gauge",
        f"hamara_process_rss_bytes {mem.rss}",
        "# HELP hamara_process_vms_bytes Virtual memory size in bytes",
        "# TYPE hamara_process_vms_bytes gauge",
        f"hamara_process_vms_bytes {mem.vms}",
        "# HELP hamara_db_pool_size Configured pool size",
        "# TYPE hamara_db_pool_size gauge",
        f"hamara_db_pool_size {pool_size}",
        "# HELP hamara_db_pool_checked_in Connections available in pool",
        "# TYPE hamara_db_pool_checked_in gauge",
        f"hamara_db_pool_checked_in {pool_checked_in}",
        "# HELP hamara_db_pool_checked_out Connections currently in use",
        "# TYPE hamara_db_pool_checked_out gauge",
        f"hamara_db_pool_checked_out {pool_checked_out}",
        "# HELP hamara_db_pool_overflow Connections beyond pool_size",
        "# TYPE hamara_db_pool_overflow gauge",
        f"hamara_db_pool_overflow {pool_overflow}",
        "# HELP hamara_db_healthy 1 if database is reachable, 0 otherwise",
        "# TYPE hamara_db_healthy gauge",
        f"hamara_db_healthy {db_ok}",
    ]
    return "\n".join(lines) + "\n"
