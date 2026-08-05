from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timezone, timedelta

from app.dependencies.database import get_db
from app.dependencies.auth import require_permission
from app.models.user import User
from app.schemas.responses import SuccessResponse
from app.services.audit_service import AuditService


from .schemas import *

router = APIRouter()


# 2. Security Center
@router.get("/security/dashboard", response_model=SuccessResponse)
def get_security_dashboard(
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("users.read.basic")),
):
    # One query replaces 6 separate COUNT queries (6 → 1 round trip)
    row = db.execute(
        text("""
        SELECT
            (SELECT COUNT(*) FROM admin_audit_logs)                                                   AS security_events,
            (SELECT COUNT(*) FROM blocked_ips)                                                         AS blocked_ips,
            (SELECT COUNT(*) FROM audit_logs  WHERE action IN ('LOGIN_FAILED','SUSPICIOUS_LOGIN'))     AS suspicious_logins,
            (SELECT COUNT(*) FROM admin_audit_logs WHERE action LIKE '%%ROLE%%')                       AS permission_changes,
            (SELECT COUNT(*) FROM system_errors)                                                       AS failed_api,
            (SELECT COUNT(*) FROM audit_logs  WHERE action = 'JWT_REFRESH')                            AS jwt_activity
    """)
    ).fetchone()

    return SuccessResponse(
        message="Security dashboard",
        data={
            "security_events": row.security_events,
            "blocked_ips": row.blocked_ips,
            "suspicious_logins": row.suspicious_logins,
            "permission_changes": row.permission_changes,
            "failed_api_requests": row.failed_api,
            "jwt_activity": row.jwt_activity,
        },
    )


@router.get("/security/blocked-ips", response_model=SuccessResponse)
def get_blocked_ips(
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("users.read.basic")),
):
    from app.models.blocked_ip import BlockedIP

    ips = db.query(BlockedIP).order_by(BlockedIP.created_at.desc()).all()
    items = []
    for ip in ips:
        items.append(
            {
                "id": str(ip.id),
                "ip_address": ip.ip_address,
                "reason": ip.reason,
                "expires_at": ip.expires_at,
                "created_at": ip.created_at,
            }
        )
    return SuccessResponse(message="Blocked IPs", data={"items": items})


@router.post("/security/blocked-ips", response_model=SuccessResponse)
def block_ip(
    req: dict,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("users.suspend")),
):
    from app.models.blocked_ip import BlockedIP

    ip = req.get("ip_address")
    if not ip:
        raise HTTPException(status_code=400, detail="IP address required")

    existing = db.query(BlockedIP).filter(BlockedIP.ip_address == ip).first()
    if existing:
        raise HTTPException(status_code=400, detail="IP already blocked")

    new_block = BlockedIP(
        ip_address=ip, reason=req.get("reason"), created_by_id=admin.id
    )
    if req.get("temporary"):
        new_block.expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

    db.add(new_block)
    db.commit()
    AuditService.log_action(
        db,
        admin.id,
        "BLOCK_IP",
        request.client.host,
        request.headers.get("user-agent"),
        {"ip": ip},
    )
    return SuccessResponse(message="IP Blocked")


@router.post("/security/blocked-ips/{id}/unblock", response_model=SuccessResponse)
def unblock_ip(
    id: str,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("users.suspend")),
):
    from app.models.blocked_ip import BlockedIP

    block = db.query(BlockedIP).filter(BlockedIP.id == id).first()
    if block:
        db.delete(block)
        db.commit()
        AuditService.log_action(
            db,
            admin.id,
            "UNBLOCK_IP",
            request.client.host,
            request.headers.get("user-agent"),
            {"ip": block.ip_address},
        )
    return SuccessResponse(message="IP Unblocked")
