from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from jose import jwt, JWTError
from app.models.system_settings import SystemSettings
from app.models.user import User, RoleEnum
from app.core.config import settings
import time

_maintenance_cache_time = 0
_maintenance_mode = False
_maintenance_message = "System is under maintenance."

def _get_maintenance_status(db):
    global _maintenance_cache_time, _maintenance_mode, _maintenance_message
    now = time.time()
    if now - _maintenance_cache_time > 30:
        settings_obj = db.query(SystemSettings).first()
        if settings_obj:
            _maintenance_mode = settings_obj.maintenance_mode
            _maintenance_message = settings_obj.maintenance_message or "System is under maintenance."
        else:
            _maintenance_mode = False
            _maintenance_message = "System is under maintenance."
        _maintenance_cache_time = now
    return _maintenance_mode, _maintenance_message

class MaintenanceMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Exclude certain paths from maintenance mode
        excluded_paths = ["/health", "/docs", "/openapi.json", "/api/v1/auth/login", "/api/v1/auth/logout", "/api/v1/status"]
        
        if not any(request.url.path.startswith(path) for path in excluded_paths):
            from app.database.session import SessionLocal
            db = SessionLocal()
            try:
                is_maint, maint_msg = _get_maintenance_status(db)
                if is_maint:
                    # Check if user is an admin
                    is_admin = False
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
                                if user and user.role in [RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN]:
                                    is_admin = True
                        except JWTError:
                            pass
                            
                    if not is_admin:
                        return JSONResponse(
                            status_code=503,
                            content={
                                "success": False,
                                "message": maint_msg,
                                "errors": []
                            }
                        )
            finally:
                db.close()
                
        return await call_next(request)
