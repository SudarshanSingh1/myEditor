from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.dependencies.database import get_db
from app.schemas.responses import SuccessResponse
import docker
import os

from fastapi import HTTPException

router = APIRouter()

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

    overall = "healthy" if health_status["database"] == "healthy" and health_status["docker"] == "healthy" else "degraded"

    return SuccessResponse(message=f"System is {overall}", data=health_status)

@router.get("/version", response_model=SuccessResponse[dict])
def get_version():
    return SuccessResponse(message="Version retrieved", data={
        "api_version": "1.0.0",
        "backend_version": "1.0.0-rc1",
        "frontend_version": "1.0.0-rc1",
        "build_number": os.environ.get("BUILD_NUMBER", "dev")
    })

@router.get("/status", response_model=SuccessResponse[dict])
def get_status(db: Session = Depends(get_db)):
    health = check_health(db)
    ver = get_version()
    from app.models.system_settings import SystemSettings
    settings_obj = db.query(SystemSettings).first()
    maintenance_mode = settings_obj.maintenance_mode if settings_obj else False
    maintenance_message = settings_obj.maintenance_message if settings_obj and getattr(settings_obj, 'maintenance_message', None) else "System is under maintenance."
    
    return SuccessResponse(message="Status retrieved", data={
        "health": health.data,
        "versions": ver.data,
        "maintenance_mode": maintenance_mode,
        "maintenance_message": maintenance_message
    })
