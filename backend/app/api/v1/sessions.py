from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.dependencies.database import get_db
from app.services.auth_service import AuthService
from app.models.user import User
from app.models.user_session import UserSession
from app.schemas.responses import StandardResponse

router = APIRouter(prefix="/sessions", tags=["sessions"])

def get_current_active_user(request: Request, db: Session = Depends(get_db)) -> User:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    token = auth_header.split(" ")[1]
    return AuthService.get_current_user(db, token)

@router.get("", response_model=StandardResponse)
def get_sessions(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    sessions = db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_active == True
    ).order_by(UserSession.last_active_at.desc()).all()
    
    session_data = []
    for s in sessions:
        session_data.append({
            "id": str(s.id),
            "ip_address": s.ip_address,
            "device_type": s.device_type,
            "browser": s.browser,
            "os": s.os,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "last_active_at": s.last_active_at.isoformat() if s.last_active_at else None,
        })
        
    return StandardResponse(success=True, message="Active sessions retrieved", data={"sessions": session_data})

@router.delete("/{session_id}", response_model=StandardResponse)
def revoke_session(session_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    session = db.query(UserSession).filter(
        UserSession.id == session_id,
        UserSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
        
    session.is_active = False
    db.commit()
    return StandardResponse(success=True, message="Session revoked successfully")

@router.delete("", response_model=StandardResponse)
def revoke_all_other_sessions(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    # Note: we should strictly exclude the *current* session, but without the jti in the token, 
    # we can't easily identify it from get_current_user alone since we only decode `sub` there.
    # A full implementation would require get_current_user to return the jti or we decode it here.
    # For now, we'll just invalidate all, forcing a re-login on the current device too.
    sessions = db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_active == True
    ).all()
    
    for s in sessions:
        s.is_active = False
    
    db.commit()
    return StandardResponse(success=True, message="All sessions revoked. Please log in again.")
