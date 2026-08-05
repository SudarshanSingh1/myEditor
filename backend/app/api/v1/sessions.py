import uuid
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
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )
    token = auth_header.split(" ")[1]
    return AuthService.get_current_user(db, token)


@router.get("", response_model=StandardResponse)
def get_sessions(
    current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
):
    sessions = (
        db.query(UserSession)
        .filter(UserSession.user_id == current_user.id, UserSession.is_active == True)
        .order_by(UserSession.last_active_at.desc())
        .all()
    )

    session_data = []
    for s in sessions:
        session_data.append(
            {
                "id": str(s.id),
                "ip_address": s.ip_address,
                "device_type": s.device_type,
                "browser": s.browser,
                "os": s.os,
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "last_active_at": s.last_active_at.isoformat()
                if s.last_active_at
                else None,
            }
        )

    return StandardResponse(
        success=True,
        message="Active sessions retrieved",
        data={"sessions": session_data},
    )


@router.delete("/{session_id}", response_model=StandardResponse)
def revoke_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    session = (
        db.query(UserSession)
        .filter(UserSession.id == session_id, UserSession.user_id == current_user.id)
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
        )

    session.is_active = False
    db.commit()
    return StandardResponse(success=True, message="Session revoked successfully")


@router.delete("", response_model=StandardResponse)
def revoke_all_other_sessions(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    # Extract the jti of the CURRENT session from the access_token cookie so we can
    # exclude it — the user should remain logged in on the device they initiated this from.
    current_jti: str | None = None
    try:
        from jose import jwt
        from app.core.config import settings

        cookie_token = request.cookies.get("access_token")
        if cookie_token:
            payload = jwt.decode(
                cookie_token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
            )
            current_jti = payload.get("jti")
    except Exception:
        pass  # If we can't decode, we'll revoke all (safe fallback)

    sessions = (
        db.query(UserSession)
        .filter(
            UserSession.user_id == current_user.id,
            UserSession.is_active == True,  # noqa: E712
        )
        .all()
    )

    revoked = 0
    for s in sessions:
        # Skip the current session if we successfully identified its jti
        if current_jti and s.session_token_jti == current_jti:
            continue
        s.is_active = False
        revoked += 1

    db.commit()
    return StandardResponse(
        success=True,
        message=f"Revoked {revoked} other session(s). Your current session remains active.",
    )
