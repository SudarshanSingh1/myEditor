from fastapi import Depends, HTTPException, status, Cookie
from sqlalchemy.orm import Session
from app.dependencies.database import get_db
from app.services.auth_service import AuthService
from app.models.user import User, RoleEnum

def get_current_user(access_token: str | None = Cookie(default=None), db: Session = Depends(get_db)) -> User:
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    return AuthService.get_current_user(db, access_token)

# Alias to support existing codebase imports easily during refactoring
get_current_user_dep = get_current_user

def require_moderator(current_user: User = Depends(get_current_user_dep)) -> User:
    if current_user.role not in [RoleEnum.MODERATOR, RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Moderator privileges required."
        )
    return current_user

def require_admin(current_user: User = Depends(get_current_user_dep)) -> User:
    if current_user.role not in [RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required."
        )
    return current_user

get_current_admin_dep = require_admin

def require_super_admin(current_user: User = Depends(get_current_user_dep)) -> User:
    if current_user.role != RoleEnum.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin privileges required."
        )
    return current_user

def get_current_user_optional(access_token: str | None = Cookie(default=None), db: Session = Depends(get_db)) -> User | None:
    if not access_token:
        return None
    try:
        return AuthService.get_current_user(db, access_token)
    except Exception:
        return None

get_current_user_dep_optional = get_current_user_optional
