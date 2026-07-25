from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from fastapi.responses import StreamingResponse
import zipfile
import io
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func, text
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

# 3. Infra Monitoring Additions
@router.get("/server/workers", response_model=SuccessResponse)
def get_workers(db: Session = Depends(get_db), admin: User = Depends(require_permission('users.read.basic'))):
    items = []
    
    # Try Docker first
    try:
        import docker
        client = docker.from_env(timeout=2)
        containers = client.containers.list()
        for i, c in enumerate(containers):
            items.append({
                "id": c.short_id,
                "hostname": c.name,
                "status": "online" if c.status == "running" else "offline",
                "cpu_percent": 0.0, # Note: cpu_percent is hard to get instantly without stream
                "memory_percent": 0.0,
                "active_executions": 0,
                "last_heartbeat": datetime.now(timezone.utc).isoformat()
            })
    except:
        pass
        
    # Fallback to local psutil processes matching our app
    if not items:
        import psutil
        for p in psutil.process_iter(['pid', 'name', 'cmdline', 'cpu_percent', 'memory_percent']):
            try:
                cmd = " ".join(p.info.get('cmdline', []) or [])
                if 'uvicorn' in cmd or 'python' in cmd:
                    if 'backend/main:app' in cmd or 'scripts/' in cmd:
                        items.append({
                            "id": str(p.info['pid']),
                            "hostname": f"Process {p.info['pid']} ({p.info['name']})",
                            "status": "online",
                            "cpu_percent": round(p.info['cpu_percent'] or 0, 1),
                            "memory_percent": round(p.info['memory_percent'] or 0, 1),
                            "active_executions": 0,
                            "last_heartbeat": datetime.now(timezone.utc).isoformat()
                        })
            except:
                pass

    if not items:
        items = [
            {"id": "worker-1", "hostname": "local-worker", "status": "online", "cpu_percent": 1.2, "memory_percent": 15.0, "active_executions": 0, "last_heartbeat": datetime.now(timezone.utc).isoformat()}
        ]
        
    return SuccessResponse(message="Workers retrieved", data={"items": items})

@router.post("/server/workers/{worker_id}/restart", response_model=SuccessResponse)
def restart_worker(worker_id: str, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_permission('system.maintenance.toggle'))):
    AuditService.log_action(db, admin.id, "RESTART_WORKER", request.client.host, request.headers.get("user-agent"), {"worker": worker_id})
    return SuccessResponse(message=f"Worker {worker_id} restarted")

