from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
from typing import Dict, Any, Optional
import uuid

class AuditService:
    @staticmethod
    def log_action(
        db: Session,
        admin_id: uuid.UUID,
        action: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        """
        Records an administrative action in the AuditLog.
        """
        log_entry = AuditLog(
            user_id=admin_id,
            action=action,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details or {}
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry
