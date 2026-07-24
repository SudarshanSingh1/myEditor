from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.dependencies.database import get_db
from app.models.user import User
from app.models.feature_flag import FeatureFlag
from app.dependencies.auth import get_current_user
from app.dependencies.auth import require_permission
from app.services.admin_audit_service import AdminAuditService

router = APIRouter()

class FeatureFlagCreate(BaseModel):
    name: str
    key: str
    description: Optional[str] = None
    enabled: bool = False
    environment: str = "production"
    rollout_percentage: int = 100

@router.get("/", dependencies=[Depends(require_permission("system.settings.view"))])
def list_flags(db: Session = Depends(get_db)):
    flags = db.query(FeatureFlag).all()
    return {
        "success": True,
        "data": {
            "items": [
                {
                    "id": f.id,
                    "name": f.name,
                    "key": f.key,
                    "description": f.description,
                    "enabled": f.enabled,
                    "environment": f.environment,
                    "rollout_percentage": f.rollout_percentage,
                    "updated_at": f.updated_at
                } for f in flags
            ]
        }
    }

@router.post("/", dependencies=[Depends(require_permission("system.settings.edit"))])
def create_flag(
    data: FeatureFlagCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if db.query(FeatureFlag).filter(FeatureFlag.key == data.key).first():
        raise HTTPException(status_code=400, detail="Feature flag with this key already exists")
        
    flag = FeatureFlag(
        name=data.name,
        key=data.key,
        description=data.description,
        enabled=data.enabled,
        environment=data.environment,
        rollout_percentage=data.rollout_percentage
    )
    db.add(flag)
    db.commit()
    
    AdminAuditService.log_action(
        db=db,
        admin_id=current_user.id,
        action="CREATE_FEATURE_FLAG",
        target_id=flag.id,
        target_type="FEATURE_FLAG",
        details={"key": flag.key}
    )
    
    return {"success": True, "message": "Feature flag created"}

@router.put("/{flag_id}", dependencies=[Depends(require_permission("system.settings.edit"))])
def update_flag(
    flag_id: str,
    data: FeatureFlagCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    flag = db.query(FeatureFlag).filter(FeatureFlag.id == flag_id).first()
    if not flag:
        raise HTTPException(status_code=404, detail="Feature flag not found")
        
    flag.name = data.name
    flag.key = data.key
    flag.description = data.description
    flag.enabled = data.enabled
    flag.environment = data.environment
    flag.rollout_percentage = data.rollout_percentage
    db.commit()
    
    AdminAuditService.log_action(
        db=db,
        admin_id=current_user.id,
        action="UPDATE_FEATURE_FLAG",
        target_id=flag.id,
        target_type="FEATURE_FLAG",
        details={"key": flag.key, "enabled": flag.enabled}
    )
    
    return {"success": True, "message": "Feature flag updated"}

@router.delete("/{flag_id}", dependencies=[Depends(require_permission("system.settings.edit"))])
def delete_flag(
    flag_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    flag = db.query(FeatureFlag).filter(FeatureFlag.id == flag_id).first()
    if not flag:
        raise HTTPException(status_code=404, detail="Feature flag not found")
        
    db.delete(flag)
    db.commit()
    
    AdminAuditService.log_action(
        db=db,
        admin_id=current_user.id,
        action="DELETE_FEATURE_FLAG",
        target_id=flag_id,
        target_type="FEATURE_FLAG",
        details={"key": flag.key}
    )
    
    return {"success": True, "message": "Feature flag deleted"}
