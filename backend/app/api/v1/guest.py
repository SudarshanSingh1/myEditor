from fastapi import APIRouter, Depends, Request, Response, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from app.dependencies.database import get_db
from app.models.guest_session import GuestSession
from jose import jwt
from app.core.config import settings

router = APIRouter()

@router.post("/init")
def initialize_guest(response: Response, request: Request, db: Session = Depends(get_db)):
    """Initialize a guest session and return a JWT token and quota."""
    
    # First check if there is an existing valid cookie
    token = request.cookies.get("access_token")
    existing_session = None
    if token:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            if payload.get("type") == "guest":
                session_id = payload.get("sub")
                existing_session = db.query(GuestSession).filter(
                    GuestSession.id == session_id,
                    GuestSession.expires_at > datetime.now(timezone.utc),
                    GuestSession.is_converted == False
                ).first()
        except Exception:
            pass

    if not existing_session:
        # Simple IP-based fingerprinting for guests
        client_ip = request.client.host if request.client else "unknown"
        
        # Check if there's an active unexpired session for this IP
        existing_session = db.query(GuestSession).filter(
            GuestSession.ip_address == client_ip,
            GuestSession.expires_at > datetime.now(timezone.utc),
            GuestSession.is_converted == False
        ).order_by(GuestSession.created_at.desc()).first()

    if existing_session:
        session = existing_session
    else:
        # Create a new session valid for 30 minutes
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
        session = GuestSession(
            ip_address=client_ip,
            expires_at=expires_at,
            execution_count=0
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        
    # Generate Guest JWT
    payload = {
        "sub": str(session.id),
        "type": "guest",
        "exp": session.expires_at,
        "iat": datetime.now(timezone.utc)
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
    
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=30 * 60,
        expires=30 * 60,
        samesite="lax",
        secure=False  # Set to True in production with HTTPS
    )
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "guest_id": session.id,
        "expires_at": session.expires_at,
        "executions_used": session.execution_count,
        "executions_max": 15 # 15 runs per 30 min
    }
