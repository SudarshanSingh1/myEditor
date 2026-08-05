from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.dependencies.database import get_db
from app.models.system_settings import SystemSettings
from app.schemas.responses import SuccessResponse

router = APIRouter()


@router.get("/", response_model=SuccessResponse)
def get_system_settings_public(db: Session = Depends(get_db)):
    settings = db.query(SystemSettings).first()
    if not settings:
        settings = SystemSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)

    # Return only public-safe fields
    safe_settings = {
        "maintenance_mode": settings.maintenance_mode,
        "maintenance_message": settings.maintenance_message,
        "registration_enabled": settings.registration_enabled,
        "login_enabled": settings.login_enabled,
        "read_only_mode": settings.read_only_mode,
        "announcement_enabled": settings.announcement_enabled,
        "announcement_message": settings.announcement_message,
        "announcement_color": settings.announcement_color,
        "feature_flags": settings.feature_flags,
    }

    return SuccessResponse(message="Settings retrieved.", data=safe_settings)
