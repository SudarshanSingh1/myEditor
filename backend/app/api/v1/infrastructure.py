from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from app.dependencies.database import get_db
from app.dependencies.auth import get_current_user, require_super_admin
from app.models.user import User
from app.models.backup_log import BackupLog
from app.models.deployment_log import DeploymentLog
from app.models.system_settings import SystemSettings
from app.models.project import Project
from app.models.execution_log import ExecutionLog
from app.services.audit_service import AuditService
from pydantic import BaseModel
import datetime
import uuid

router = APIRouter()

class BackupRequest(BaseModel):
    type: str = "MANUAL"
    
class DeploymentRequest(BaseModel):
    version: str
    build_number: str
    environment: str
    release_notes: str = ""

class FactoryResetRequest(BaseModel):
    confirm: str
    scope: list[str]

@router.get("/backups")
def get_backups(db: Session = Depends(get_db), current_user: User = Depends(require_super_admin)):
    backups = db.query(BackupLog).order_by(BackupLog.created_at.desc()).all()
    return {"success": True, "data": [{"id": b.id, "filename": b.filename, "status": b.status, "type": b.type} for b in backups]}

@router.post("/backups")
def create_backup(req: BackupRequest, db: Session = Depends(get_db), current_user: User = Depends(require_super_admin)):
    filename = f"backup_{datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.dump"
    new_backup = BackupLog(
        filename=filename,
        size_bytes=0,
        status="COMPLETED",
        type=req.type,
        completed_at=func.now() if req.type == "MANUAL" else None
    )
    db.add(new_backup)
    db.commit()
    db.refresh(new_backup)
    
    AuditService.log_action(db, current_user.id, "TRIGGER_BACKUP", details={"backup_id": new_backup.id})
    return {"success": True, "message": "Backup triggered successfully", "data": {"id": new_backup.id, "filename": new_backup.filename}}

@router.post("/backups/{backup_id}/restore")
def restore_backup(backup_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_super_admin)):
    backup = db.query(BackupLog).filter(BackupLog.id == backup_id).first()
    if not backup:
        raise HTTPException(status_code=404, detail="Backup not found")
        
    AuditService.log_action(db, current_user.id, "RESTORE_BACKUP", details={"backup_id": backup.id})
    return {"success": True, "message": "Restore initiated (mock)"}

@router.get("/deployments")
def get_deployments(db: Session = Depends(get_db), current_user: User = Depends(require_super_admin)):
    deps = db.query(DeploymentLog).order_by(DeploymentLog.deployed_at.desc()).all()
    return {"success": True, "data": [{"id": d.id, "version": d.version, "environment": d.environment} for d in deps]}

@router.post("/deployments")
def create_deployment(req: DeploymentRequest, db: Session = Depends(get_db), current_user: User = Depends(require_super_admin)):
    new_dep = DeploymentLog(
        version=req.version,
        build_number=req.build_number,
        environment=req.environment,
        release_notes=req.release_notes,
        deployed_by_id=current_user.id
    )
    db.add(new_dep)
    db.commit()
    db.refresh(new_dep)
    AuditService.log_action(db, current_user.id, "RECORD_DEPLOYMENT", details={"deployment_id": new_dep.id})
    return {"success": True, "message": "Deployment recorded", "data": {"id": new_dep.id, "version": new_dep.version}}

@router.post("/factory-reset")
def factory_reset(req: FactoryResetRequest, db: Session = Depends(get_db), current_user: User = Depends(require_super_admin)):
    if req.confirm != "I_UNDERSTAND_THIS_IS_IRREVERSIBLE":
        raise HTTPException(status_code=400, detail="Invalid confirmation string")
        
    if not req.scope:
        raise HTTPException(status_code=400, detail="No scope selected")
        
    cleared = []
    
    try:
        if "executions" in req.scope:
            db.query(ExecutionLog).delete()
            cleared.append("executions")
            
        if "projects" in req.scope:
            db.query(Project).delete()
            cleared.append("projects")
            
        if "users" in req.scope:
            # Delete everyone EXCEPT the current user
            db.query(User).filter(User.id != current_user.id).delete()
            cleared.append("users (excluding you)")
            
        db.commit()
        
        AuditService.log_action(db, current_user.id, "FACTORY_RESET", details={"scope": cleared})
        return {"success": True, "message": f"Factory reset completed. Cleared: {', '.join(cleared)}"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(e)}")
