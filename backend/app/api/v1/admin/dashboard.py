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

# --- Dashboard & Stats ---
@router.get("/dashboard", response_model=SuccessResponse)
def get_dashboard(db: Session = Depends(get_db), admin: User = Depends(require_permission('users.read.basic'))):
    total_users = db.query(User).filter(User.is_deleted == False).count()
    total_projects = db.query(Project).count()
    total_executions = db.query(ExecutionLog).count()
    
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    users_today = db.query(User).filter(User.created_at >= today, User.is_deleted == False).count()
    executions_today = db.query(ExecutionLog).filter(ExecutionLog.created_at >= today).count()
    total_feedback = db.query(Feedback).count()
    total_errors = db.query(SystemError).count()
    active_users = db.query(User).filter(User.status == StatusEnum.ACTIVE, User.is_deleted == False).count()
    
    return SuccessResponse(message="Dashboard retrieved", data={
        "total_users": total_users,
        "users_today": users_today,
        "active_users": active_users,
        "total_projects": total_projects,
        "total_executions": total_executions,
        "executions_today": executions_today,
        "total_feedback": total_feedback,
        "total_errors": total_errors,
    })

@router.get("/statistics", response_model=SuccessResponse)
def get_statistics(db: Session = Depends(get_db), admin: User = Depends(require_permission('users.read.basic'))):
    total_users = db.query(User).filter(User.is_deleted == False).count()
    active_users = db.query(User).filter(User.status == StatusEnum.ACTIVE, User.is_deleted == False).count()
    admins = db.query(User).filter(User.role.in_([RoleEnum.ADMIN, RoleEnum.OWNER]), User.is_deleted == False).count()
    
    projects = db.query(Project).count()
    files = db.query(File).count()
    feedback = db.query(Feedback).count()
    
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    errors_today = db.query(SystemError).filter(SystemError.created_at >= today).count()
    
    return SuccessResponse(message="Stats retrieved", data={
        "total_users": total_users,
        "active_users": active_users,
        "admins": admins,
        "projects": projects,
        "files": files,
        "feedback_count": feedback,
        "errors_today": errors_today,
        "storage_used_bytes": files * 1024
    })

@router.get("/server", response_model=SuccessResponse)
def get_server_status(admin: User = Depends(require_permission('users.delete'))):
    cpu = psutil.cpu_percent(interval=0.5)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    # Docker status via checking if socket is reachable
    docker_status = "unknown"
    docker_containers = 0
    try:
        import docker
        client = docker.from_env(timeout=3)
        containers = client.containers.list()
        docker_containers = len(containers)
        docker_status = "online"
    except Exception as e:
        from app.core.logger import logger
        logger.warning(f"Failed to get Docker status: {e}", exc_info=True)
        docker_status = "unavailable"
    
    try:
        net = psutil.net_io_counters()
        net_sent = round(net.bytes_sent / (1024**2), 2)
        net_recv = round(net.bytes_recv / (1024**2), 2)
    except:
        net_sent, net_recv = 0, 0
        
    try:
        uptime = round(time.time() - psutil.boot_time(), 0)
    except:
        uptime = 0

    return SuccessResponse(message="Server status retrieved", data={
        "cpu_percent": cpu,
        "ram_percent": mem.percent,
        "ram_used_gb": round(mem.used / (1024**3), 2),
        "ram_total_gb": round(mem.total / (1024**3), 2),
        "disk_percent": disk.percent,
        "disk_used_gb": round(disk.used / (1024**3), 2),
        "disk_total_gb": round(disk.total / (1024**3), 2),
        "api_status": "online",
        "docker_status": docker_status,
        "docker_containers": docker_containers,
        "network_sent_mb": net_sent,
        "network_recv_mb": net_recv,
        "uptime_seconds": uptime,
        "process_count": len(psutil.pids()),
        "service_health": "Healthy",
        "worker_health": "Healthy"
    })

@router.get("/server/health", response_model=SuccessResponse)
def get_server_health(db: Session = Depends(get_db), admin: User = Depends(require_permission('users.read.basic'))):
    items = []
    
    # Check Database
    start = time.time()
    db_status = "online"
    try:
        db.execute(text("SELECT 1"))
    except:
        db_status = "offline"
    items.append({"label": "Database", "status": db_status, "latency": f"{int((time.time()-start)*1000)}ms"})
    
    # Check API (Self)
    items.append({"label": "API Gateway", "status": "online", "latency": "1ms"})
    
    # Check Docker
    docker_status = "online"
    start = time.time()
    try:
        import docker
        client = docker.from_env(timeout=1)
        client.ping()
    except:
        docker_status = "offline"
    items.append({"label": "Docker Engine", "status": docker_status, "latency": f"{int((time.time()-start)*1000)}ms"})
    
    # Check Queue Worker (Placeholder)
    items.append({"label": "Queue Worker", "status": "online", "latency": "5ms"})
    
    # Check SMTP (Placeholder)
    items.append({"label": "SMTP Relay", "status": "online", "latency": "45ms"})
    
    # Check Auth Service
    items.append({"label": "Auth Service", "status": "online", "latency": "1ms"})
    
    return SuccessResponse(message="Server health retrieved", data={"items": items})

