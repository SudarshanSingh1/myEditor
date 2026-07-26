from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import secrets
import hashlib
from typing import List

from app.dependencies.database import get_db
from app.models.user import User
from app.models.api_key import ApiKey
from app.dependencies.auth import get_current_user
from app.dependencies.auth import require_permission
from app.services.admin_audit_service import AdminAuditService

router = APIRouter()

@router.get("/", dependencies=[Depends(require_permission("system.settings.view"))])
def list_api_keys(db: Session = Depends(get_db)):
    keys = db.query(ApiKey).all()
    return {
        "success": True,
        "data": {
            "items": [
                {
                    "id": k.id,
                    "name": k.name,
                    "prefix": k.prefix,
                    "scopes": k.scopes,
                    "created_at": k.created_at,
                    "expires_at": k.expires_at,
                    "last_used_at": k.last_used_at,
                    "revoked_at": k.revoked_at
                } for k in keys
            ]
        }
    }

@router.post("/", dependencies=[Depends(require_permission("system.settings.edit"))])
def create_api_key(
    name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Generate raw key
    raw_key = f"sk_live_{secrets.token_urlsafe(32)}"
    
    # Hash the key
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    prefix = raw_key[:12]
    
    new_key = ApiKey(
        name=name,
        key_hash=key_hash,
        prefix=prefix,
        scopes=["*"]
    )
    db.add(new_key)
    db.commit()
    
    AdminAuditService.log_action(
        db=db,
        actor_id=current_user.id,
        action="CREATE_API_KEY",
        metadata_json={"name": name, "target_type": "API_KEY", "api_key_id": new_key.id}
    )
    
    return {
        "success": True,
        "message": "API Key created successfully. Please copy it now, it will not be shown again.",
        "data": {
            "raw_key": raw_key,
            "id": new_key.id,
            "prefix": new_key.prefix
        }
    }

@router.post("/{key_id}/revoke", dependencies=[Depends(require_permission("system.settings.edit"))])
def revoke_api_key(
    key_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
    if not key:
        raise HTTPException(status_code=404, detail="API Key not found")
        
    from app.utils.dates import utc_now
    key.revoked_at = utc_now()
    db.commit()
    
    AdminAuditService.log_action(
        db=db,
        actor_id=current_user.id,
        action="REVOKE_API_KEY",
        metadata_json={"name": key.name, "target_type": "API_KEY", "api_key_id": key.id}
    )
    
    return {"success": True, "message": "API Key revoked successfully"}
