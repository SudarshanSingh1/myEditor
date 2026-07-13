from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from jose import jwt, JWTError
from app.models.system_settings import SystemSettings
from app.models.user import User, RoleEnum
from app.core.config import settings
import time

from datetime import datetime, timezone

_maintenance_cache_time = 0
_maintenance_config = {
    "enabled": False,
    "message": "System is under maintenance.",
    "end_time": None,
    "allow_admin": True,
    "show_countdown": True
}

def _get_maintenance_status(db):
    global _maintenance_cache_time, _maintenance_config
    now = time.time()
    if now - _maintenance_cache_time > 5:  # Cache for 5 seconds
        settings_obj = db.query(SystemSettings).first()
        if settings_obj:
            is_enabled = settings_obj.maintenance_mode
            
            # Auto recovery
            if is_enabled and settings_obj.maintenance_end_time:
                if datetime.now(timezone.utc) > settings_obj.maintenance_end_time:
                    is_enabled = False
                    
            _maintenance_config = {
                "enabled": is_enabled,
                "message": settings_obj.maintenance_message or "System is under maintenance.",
                "end_time": settings_obj.maintenance_end_time,
                "allow_admin": getattr(settings_obj, "maintenance_allow_admin_access", True),
                "show_countdown": getattr(settings_obj, "maintenance_show_countdown", True)
            }
        else:
            _maintenance_config["enabled"] = False
        _maintenance_cache_time = now
    return _maintenance_config

class MaintenanceMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Exclude certain paths from maintenance mode
        excluded_paths = [
            "/health",
            "/docs",
            "/openapi.json",
            "/api/v1/auth/login",
            "/api/v1/auth/logout",
            "/api/v1/auth/register",
            "/api/v1/auth/request-password-reset",
            "/api/v1/auth/reset-password",
            "/api/v1/auth/verify-email",
            "/api/v1/system/status",
            # OAuth – authorize redirects and code-exchange callbacks must always work
            # so that admins/super-admins can still log in during maintenance
            "/api/v1/auth/oauth",
        ]
        
        if not any(request.url.path.startswith(path) for path in excluded_paths):
            from app.database.session import SessionLocal
            db = SessionLocal()
            try:
                config = _get_maintenance_status(db)
                if config["enabled"]:
                    is_admin_allowed = False
                    
                    token = request.cookies.get("access_token")
                    if not token:
                        auth_header = request.headers.get("Authorization")
                        if auth_header and auth_header.startswith("Bearer "):
                            token = auth_header.split(" ")[1]
                    
                    if token:
                        try:
                            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
                            user_id = payload.get("sub")
                            if user_id:
                                user = db.query(User).filter(User.id == user_id).first()
                                if user:
                                    if user.role == RoleEnum.SUPER_ADMIN:
                                        is_admin_allowed = True
                                    elif config["allow_admin"] and user.role in [RoleEnum.ADMIN, RoleEnum.MODERATOR]:
                                        is_admin_allowed = True
                        except JWTError:
                            pass
                                
                    if not is_admin_allowed:
                        return JSONResponse(
                            status_code=503,
                            content={
                                "success": False,
                                "message": config["message"],
                                "maintenance_info": {
                                    "end_time": config["end_time"].isoformat() if config["end_time"] and config["show_countdown"] else None,
                                    "server_time": datetime.now(timezone.utc).isoformat()
                                }
                            }
                        )
            finally:
                db.close()
                
        return await call_next(request)
