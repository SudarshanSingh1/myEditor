from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.dependencies.database import get_db
from app.models.system_settings import SystemSettings
from datetime import datetime, timezone
from app.schemas.responses import SuccessResponse

router = APIRouter()

@router.get("/status")
def get_system_status(db: Session = Depends(get_db)):
    settings = db.query(SystemSettings).first()
    
    if not settings:
        return SuccessResponse(message="System status retrieved.", data={
            "maintenance_enabled": False,
            "message": "System is under maintenance.",
            "countdown": None,
            "server_time": datetime.now(timezone.utc).isoformat()
        })
        
    return SuccessResponse(message="System status retrieved.", data={
        "maintenance_enabled": settings.maintenance_mode,
        "message": settings.maintenance_message or "System is under maintenance.",
        "countdown": settings.maintenance_end_time.isoformat() if settings.maintenance_show_countdown and settings.maintenance_end_time else None,
        "server_time": datetime.now(timezone.utc).isoformat()
    })
