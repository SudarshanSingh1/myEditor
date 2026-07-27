from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from fastapi.responses import StreamingResponse
import zipfile
import io
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func, text, cast, String
import uuid
from datetime import datetime, timezone, timedelta
import psutil
import time
import secrets
import string
import smtplib
from app.core.security import encrypt_string, decrypt_string, get_fernet_key
from cryptography.fernet import Fernet
from app.core.config import settings

from app.dependencies.database import get_db
from app.dependencies.auth import require_permission, require_admin, require_moderator, require_super_admin
from app.models.user import User, RoleEnum, StatusEnum
from app.models.project import Project
from app.models.feedback import Feedback, FeedbackStatus
from app.models.system_error import SystemError
from app.models.audit_log import AuditLog
from app.models.workspace import File
from app.models.execution_log import ExecutionLog
from app.models.system_settings import SystemSettings
from app.models.email_log import EmailLog, EmailStatus
from app.models.user_activity import UserActivity
from app.schemas.responses import SuccessResponse
from app.services.audit_service import AuditService
from app.services.email_service import EmailService
from app.core.security import get_password_hash
from pydantic import BaseModel, EmailStr



from .schemas import *

router = APIRouter()

# --- Executions ---
@router.get("/executions/dashboard", response_model=SuccessResponse)
def get_executions_dashboard(db: Session = Depends(get_db), admin: User = Depends(require_permission('users.read.basic'))):
    from app.models.execution_log import ExecutionStatus
    total = db.query(ExecutionLog).count()
    running = db.query(ExecutionLog).filter(cast(ExecutionLog.status, String) == ExecutionStatus.RUNNING.value).count()
    queued = db.query(ExecutionLog).filter(cast(ExecutionLog.status, String) == ExecutionStatus.QUEUED.value).count()
    failed = db.query(ExecutionLog).filter(cast(ExecutionLog.status, String).in_([
        ExecutionStatus.COMPILE_ERROR.value, 
        ExecutionStatus.RUNTIME_ERROR.value, 
        ExecutionStatus.TIMEOUT.value, 
        ExecutionStatus.SYSTEM_ERROR.value
    ])).count()
    completed = db.query(ExecutionLog).filter(cast(ExecutionLog.status, String) == ExecutionStatus.SUCCESS.value).count()
    cancelled = db.query(ExecutionLog).filter(cast(ExecutionLog.status, String) == ExecutionStatus.CANCELLED.value).count()
    
    avg_runtime = db.query(func.avg(ExecutionLog.execution_time_ms)).filter(ExecutionLog.execution_time_ms.isnot(None)).scalar() or 0
    active_containers = running
    failure_rate = (failed / total * 100) if total > 0 else 0
    success_rate = (completed / total * 100) if total > 0 else 0
    
    data = {
        "running_executions": running,
        "queued_executions": queued,
        "failed_executions": failed,
        "completed_executions": completed,
        "cancelled_executions": cancelled,
        "live_queue_status": "Operational",
        "running_workers": running,
        "average_runtime_ms": round(avg_runtime),
        "queue_length": queued,
        "failure_rate": round(failure_rate, 1),
        "success_rate": round(success_rate, 1),
        "active_containers": running
    }
    return SuccessResponse(message="Dashboard retrieved", data=data)

@router.get("/executions", response_model=SuccessResponse)
def get_executions(
    skip: int = 0, limit: int = 50,
    search: str = None, status: str = None, language: str = None,
    sort_by: str = "created_at", sort_desc: bool = True,
    db: Session = Depends(get_db), admin: User = Depends(require_permission('users.read.basic'))
):
    query = db.query(ExecutionLog, User, Project).outerjoin(User, ExecutionLog.user_id == User.id).outerjoin(Project, ExecutionLog.project_id == Project.id)
    
    if search:
        query = query.filter(
            User.username.ilike(f"%{search}%") | 
            Project.name.ilike(f"%{search}%")
        )
    if status:
        query = query.filter(ExecutionLog.status == status)
    if language:
        query = query.filter(ExecutionLog.language == language)
        
    total = query.count()
    
    sort_col = getattr(ExecutionLog, sort_by, ExecutionLog.created_at)
    if sort_desc:
        query = query.order_by(sort_col.desc())
    else:
        query = query.order_by(sort_col.asc())
        
    rows = query.offset(skip).limit(limit).all()
    
    items = []
    for log, user, project in rows:
        items.append({
            "id": str(log.id), "language": log.language, "status": log.status,
            "duration_ms": log.execution_time_ms, "created_at": log.created_at,
            "username": user.username if user else "Anonymous",
            "project_name": project.name if project else "Unknown"
        })
    return SuccessResponse(message="Executions retrieved", data={"items": items, "total": total})

@router.get("/executions/audit", response_model=SuccessResponse)
def get_executions_audit(
    skip: int = 0, limit: int = 50,
    search: str = None,
    db: Session = Depends(get_db), admin: User = Depends(require_permission('users.read.basic'))
):
    from app.models.audit_log import AuditLog
    query = db.query(AuditLog, User).outerjoin(User, AuditLog.user_id == User.id).filter(AuditLog.action.like("EXECUTION_%"))
    
    if search:
        query = query.filter(User.username.ilike(f"%{search}%"))
        
    total = query.count()
    rows = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    
    items = []
    for log, user in rows:
        items.append({
            "id": str(log.id), "action": log.action, "created_at": log.created_at,
            "ip_address": log.ip_address, "details": log.details,
            "username": user.username if user else "System"
        })
    return SuccessResponse(message="Execution audits retrieved", data={"items": items, "total": total})

@router.get("/executions/{execution_id}/details", response_model=SuccessResponse)
def get_execution_details(
    execution_id: uuid.UUID,
    db: Session = Depends(get_db), admin: User = Depends(require_permission('users.read.basic'))
):
    row = db.query(ExecutionLog, User, Project).outerjoin(User, ExecutionLog.user_id == User.id).outerjoin(Project, ExecutionLog.project_id == Project.id).filter(ExecutionLog.id == execution_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Execution not found")
        
    log, user, project = row
    
    data = {
        "id": str(log.id),
        "user": user.username if user else "Unknown",
        "project": project.name if project else "Unknown",
        "language": log.language,
        "compiler": log.compiler or "Default",
        "runtime": log.execution_time_ms,
        "cpu_usage": log.cpu_usage or "0.0%",
        "memory_usage": log.memory_usage or "0MB",
        "container_id": log.container_id or "N/A",
        "worker_node": log.worker_node or "worker-0",
        "queue_position": log.queue_position,
        "exit_code": log.exit_code,
        "start_time": log.start_time or log.created_at,
        "end_time": log.end_time or log.created_at,
        "env_vars": log.env_vars or "{}",
        "logs": log.logs or "",
        "error_output": log.error_output or "",
        "status": log.status
    }
    
    return SuccessResponse(message="Execution details retrieved", data=data)

@router.post("/executions/{execution_id}/{action}", response_model=SuccessResponse)
def perform_execution_action(
    execution_id: uuid.UUID, action: str, request: Request,
    db: Session = Depends(get_db), admin: User = Depends(require_permission('users.delete'))
):
    log = db.query(ExecutionLog).filter(ExecutionLog.id == execution_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Execution not found")
        
    from app.models.execution_log import ExecutionStatus
    
    if action == "kill":
        log.status = ExecutionStatus.CANCELLED
        log.end_time = datetime.now(timezone.utc)
    elif action == "retry":
        log.status = ExecutionStatus.QUEUED
        log.queue_position = 1
    elif action == "requeue":
        log.status = ExecutionStatus.QUEUED
        log.queue_position = 100
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
        
    db.commit()
    AuditService.log_action(db, admin.id, f"EXECUTION_{action.upper()}", request.client.host, request.headers.get("user-agent"), {"execution_id": str(execution_id)})
    
    return SuccessResponse(message=f"Execution {action} successful")

@router.get("/executions/{execution_id}/logs/download")
def download_execution_logs(
    execution_id: uuid.UUID, request: Request,
    db: Session = Depends(get_db), admin: User = Depends(require_permission('users.read.basic'))
):
    log = db.query(ExecutionLog).filter(ExecutionLog.id == execution_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Execution not found")
        
    content = log.logs or "No logs available."
    if log.error_output:
        content += f"\n\n--- Error Output ---\n{log.error_output}"
        
    AuditService.log_action(db, admin.id, "EXECUTION_LOGS_DOWNLOADED", request.client.host, request.headers.get("user-agent"), {"execution_id": str(execution_id)})
    
    return StreamingResponse(
        io.BytesIO(content.encode('utf-8')),
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="execution_{execution_id}.log"'}
    )

@router.delete("/executions/{execution_id}", response_model=SuccessResponse)
def delete_execution(
    execution_id: str,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("projects.delete"))
):
    ex = db.query(ExecutionLog).filter(ExecutionLog.id == execution_id).first()
    if not ex:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    db.delete(ex)
    db.commit()
    
    AuditService.log_action(db, admin.id, "DELETE_EXECUTION", request.client.host, request.headers.get("user-agent"), {"execution_id": execution_id})
    return SuccessResponse(message="Execution deleted successfully")

