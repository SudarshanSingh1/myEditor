from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
from typing import Dict, Any, Optional
import uuid
import datetime

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
        safe_details = {}
        if details:
            for k, v in details.items():
                if isinstance(v, datetime.datetime):
                    safe_details[k] = v.isoformat()
                elif isinstance(v, uuid.UUID):
                    safe_details[k] = str(v)
                else:
                    safe_details[k] = v

        log_entry = AuditLog(
            user_id=admin_id,
            action=action,
            ip_address=ip_address,
            user_agent=user_agent,
            details=safe_details
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry
