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
    if current_user.role not in [RoleEnum.MODERATOR, RoleEnum.ADMIN, RoleEnum.OWNER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Moderator privileges required."
        )
    return current_user

def require_admin(current_user: User = Depends(get_current_user_dep)) -> User:
    if current_user.role not in [RoleEnum.ADMIN, RoleEnum.OWNER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required."
        )
    return current_user

get_current_admin_dep = require_admin

def require_super_admin(current_user: User = Depends(get_current_user_dep)) -> User:
    if current_user.role != RoleEnum.OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owner privileges required."
        )
    return current_user

def require_permission(required_node: str):
    """
    Dependency generator for checking if the current user has a specific permission node.
    Usage: Depends(require_permission("projects.create"))
    """
    def permission_checker(current_user: User = Depends(get_current_user_dep)) -> User:
        if current_user.role == RoleEnum.OWNER:
            return current_user
        
        # Check effective permissions cache
        if required_node not in (current_user.effective_permissions or []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required permission: {required_node}"
            )
        return current_user
        
    return permission_checker

def get_current_user_optional(access_token: str | None = Cookie(default=None), db: Session = Depends(get_db)) -> User | None:
    if not access_token:
        return None
    try:
        return AuthService.get_current_user(db, access_token)
    except Exception:
        return None

get_current_user_dep_optional = get_current_user_optional
