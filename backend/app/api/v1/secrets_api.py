from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.dependencies.database import get_db
from app.models.user import User
from app.models.secret import Secret
from app.dependencies.auth import get_current_user
from app.dependencies.auth import require_permission
from app.utils.crypto import encrypt_value, mask_secret
from app.services.admin_audit_service import AdminAuditService

router = APIRouter()

class SecretCreate(BaseModel):
    name: str
    category: str = "general"
    value: str

@router.get("/", dependencies=[Depends(require_permission("system.settings.view"))])
def list_secrets(db: Session = Depends(get_db)):
    secrets_db = db.query(Secret).all()
    return {
        "success": True,
        "data": {
            "items": [
                {
                    "id": s.id,
                    "name": s.name,
                    "category": s.category,
                    "masked_value": s.masked_value,
                    "created_at": s.created_at,
                    "updated_at": s.updated_at
                } for s in secrets_db
            ]
        }
    }

@router.post("/", dependencies=[Depends(require_permission("system.settings.edit"))])
def create_secret(
    data: SecretCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if db.query(Secret).filter(Secret.name == data.name).first():
        raise HTTPException(status_code=400, detail="Secret with this name already exists")
        
    encrypted = encrypt_value(data.value)
    masked = mask_secret(data.value)
    
    sec = Secret(
        name=data.name,
        category=data.category,
        encrypted_value=encrypted,
        masked_value=masked
    )
    db.add(sec)
    db.commit()
    
    AdminAuditService.log_action(
        db=db,
        actor_id=current_user.id,
        action="CREATE_SECRET",
        metadata_json={"name": sec.name, "target_type": "SECRET", "secret_id": sec.id}
    )
    
    return {"success": True, "message": "Secret created successfully"}

@router.put("/{secret_id}", dependencies=[Depends(require_permission("system.settings.edit"))])
def update_secret(
    secret_id: str,
    data: SecretCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sec = db.query(Secret).filter(Secret.id == secret_id).first()
    if not sec:
        raise HTTPException(status_code=404, detail="Secret not found")
        
    sec.name = data.name
    sec.category = data.category
    
    # If a new value is provided (not empty and not masked)
    if data.value and not data.value.startswith("****"):
        sec.encrypted_value = encrypt_value(data.value)
        sec.masked_value = mask_secret(data.value)
        
    db.commit()
    
    AdminAuditService.log_action(
        db=db,
        actor_id=current_user.id,
        action="UPDATE_SECRET",
        metadata_json={"name": sec.name, "target_type": "SECRET", "secret_id": sec.id}
    )
    
    return {"success": True, "message": "Secret updated successfully"}

@router.delete("/{secret_id}", dependencies=[Depends(require_permission("system.settings.edit"))])
def delete_secret(
    secret_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sec = db.query(Secret).filter(Secret.id == secret_id).first()
    if not sec:
        raise HTTPException(status_code=404, detail="Secret not found")
        
    db.delete(sec)
    db.commit()
    
    AdminAuditService.log_action(
        db=db,
        actor_id=current_user.id,
        action="DELETE_SECRET",
        metadata_json={"name": sec.name, "target_type": "SECRET", "secret_id": secret_id}
    )
    
    return {"success": True, "message": "Secret deleted successfully"}
