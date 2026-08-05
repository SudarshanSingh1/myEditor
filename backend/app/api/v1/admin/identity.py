from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.dependencies.database import get_db
from app.dependencies.auth import require_permission
from app.models.user import User
from app.schemas.responses import SuccessResponse
from app.services.audit_service import AuditService


from .schemas import *

router = APIRouter()

# --- Platform Control Center ---


# 1. Identity & Auth Center
@router.get("/identity/dashboard", response_model=SuccessResponse)
def get_identity_dashboard(
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("users.read.basic")),
):
    from app.models.audit_log import AuditLog
    from app.models.user_session import UserSession
    from app.models.oauth_account import OAuthAccount

    total_users = db.query(User).count()
    active_sessions = db.query(UserSession).count()
    online_users = (
        db.query(func.count(func.distinct(UserSession.user_id))).scalar() or 0
    )
    mfa_enabled = db.query(User).filter(User.totp_enabled == True).count()
    oauth_users = (
        db.query(func.count(func.distinct(OAuthAccount.user_id))).scalar() or 0
    )

    failed_logins = db.query(AuditLog).filter(AuditLog.action == "LOGIN_FAILED").count()

    return SuccessResponse(
        message="Identity dashboard retrieved",
        data={
            "total_users": total_users,
            "active_sessions": active_sessions,
            "online_users": online_users,
            "failed_logins": failed_logins,
            "mfa_enabled": mfa_enabled,
            "oauth_connected": oauth_users,
        },
    )


@router.get("/identity/sessions", response_model=SuccessResponse)
def get_identity_sessions(
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("users.read.basic")),
):
    from app.models.user_session import UserSession

    sessions = (
        db.query(UserSession, User.username)
        .join(User, UserSession.user_id == User.id)
        .filter(UserSession.is_active == True)
        .filter(User.is_deleted == False)
        .order_by(UserSession.created_at.desc())
        .limit(100)
        .all()
    )

    items = []
    for s, un in sessions:

        def _clean(val: str) -> str:
            """Safety-net: map user-agents library's 'Other' placeholder to 'Unknown'."""
            return val if val and val.lower() not in ("other", "", "none") else "Unknown"

        device_type = s.device_type
        browser = s.browser
        os_name = s.os

        # Fallback for legacy sessions that only have user_agent string
        if not device_type or not browser or not os_name:
            from user_agents import parse
            ua = parse(s.user_agent or "")
            device_type = device_type or ("Mobile" if ua.is_mobile else "Tablet" if ua.is_tablet else "Bot" if ua.is_bot else "Desktop" if getattr(ua.device, 'family', '') == "Other" else getattr(ua.device, 'family', "Unknown"))
            browser = browser or _clean(getattr(ua.browser, 'family', "Unknown"))
            os_name = os_name or _clean(getattr(ua.os, 'family', "Unknown"))

        items.append(
            {
                "id": str(s.id),
                "user": un,
                "device": _clean(device_type or ""),
                "browser": _clean(browser or ""),
                "os": _clean(os_name or ""),
                "ip_address": s.ip_address,
                "country": s.country or "Unknown",
                "login_time": s.created_at,
                "last_activity": s.last_active_at,
                "status": "Active" if s.is_active else "Revoked",
            }
        )
    return SuccessResponse(message="Sessions retrieved", data={"items": items})


@router.post("/identity/sessions/{session_id}/revoke", response_model=SuccessResponse)
def revoke_session(
    session_id: str,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("users.suspend")),
):
    from app.models.user_session import UserSession

    session = db.query(UserSession).filter(UserSession.id == session_id).first()
    if session:
        db.delete(session)
        db.commit()
        AuditService.log_action(
            db,
            admin.id,
            "REVOKE_SESSION",
            request.client.host,
            request.headers.get("user-agent"),
            {"session_id": session_id},
        )
    return SuccessResponse(message="Session revoked")


@router.post("/identity/sessions/revoke-all", response_model=SuccessResponse)
def revoke_all_sessions(
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("users.suspend")),
):
    from app.models.user_session import UserSession

    db.query(UserSession).delete()
    db.commit()
    AuditService.log_action(
        db,
        admin.id,
        "REVOKE_ALL_SESSIONS",
        request.client.host,
        request.headers.get("user-agent"),
        {},
    )
    return SuccessResponse(message="All sessions revoked")
