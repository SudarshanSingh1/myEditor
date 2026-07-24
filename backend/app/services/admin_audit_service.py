from sqlalchemy.orm import Session
from app.models.admin_audit_log import AdminAuditLog
from fastapi import Request
from typing import Any, Dict, Optional
import uuid

class AdminAuditService:
    @staticmethod
    def log_action(
        db: Session,
        actor_id: uuid.UUID,
        action: str,
        target_id: Optional[uuid.UUID] = None,
        permission_used: Optional[str] = None,
        request: Optional[Request] = None,
        metadata_json: Optional[Dict[str, Any]] = None
    ):
        ip_address = None
        user_agent = None
        
        if request:
            ip_address = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent")
            
            # Use proxy IP if available
            forwarded_for = request.headers.get("x-forwarded-for")
            if forwarded_for:
                ip_address = forwarded_for.split(",")[0].strip()

        log = AdminAuditLog(
            actor_id=actor_id,
            target_id=target_id,
            action=action,
            permission_used=permission_used,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata_json=metadata_json
        )
        db.add(log)
        db.commit()
