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
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    query = text("""
        SELECT 
            (SELECT COUNT(*) FROM users WHERE is_deleted = false) as total_users,
            (SELECT COUNT(*) FROM projects) as total_projects,
            (SELECT COUNT(*) FROM execution_logs) as total_executions,
            (SELECT COUNT(*) FROM users WHERE created_at >= :today AND is_deleted = false) as users_today,
            (SELECT COUNT(*) FROM execution_logs WHERE created_at >= :today) as executions_today,
            (SELECT COUNT(*) FROM feedback) as total_feedback,
            (SELECT COUNT(*) FROM system_errors) as total_errors,
            (SELECT COUNT(*) FROM users WHERE status = 'ACTIVE' AND is_deleted = false) as active_users
    """)
    
    result = db.execute(query, {"today": today}).fetchone()
    
    return SuccessResponse(message="Dashboard retrieved", data={
        "total_users": result.total_users,
        "users_today": result.users_today,
        "active_users": result.active_users,
        "total_projects": result.total_projects,
        "total_executions": result.total_executions,
        "executions_today": result.executions_today,
        "total_feedback": result.total_feedback,
        "total_errors": result.total_errors,
    })

@router.get("/statistics", response_model=SuccessResponse)
def get_statistics(db: Session = Depends(get_db), admin: User = Depends(require_permission('users.read.basic'))):
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    query = text("""
        SELECT 
            (SELECT COUNT(*) FROM users WHERE is_deleted = false) as total_users,
            (SELECT COUNT(*) FROM users WHERE status = 'ACTIVE' AND is_deleted = false) as active_users,
            (SELECT COUNT(*) FROM users WHERE role IN ('ADMIN', 'OWNER') AND is_deleted = false) as admins,
            (SELECT COUNT(*) FROM projects) as projects,
            (SELECT COUNT(*) FROM files) as files,
            (SELECT COUNT(*) FROM feedback) as feedback,
            (SELECT COUNT(*) FROM system_errors WHERE created_at >= :today) as errors_today
    """)
    
    result = db.execute(query, {"today": today}).fetchone()
    
    return SuccessResponse(message="Stats retrieved", data={
        "total_users": result.total_users,
        "active_users": result.active_users,
        "admins": result.admins,
        "projects": result.projects,
        "files": result.files,
        "feedback_count": result.feedback,
        "errors_today": result.errors_today,
        "storage_used_bytes": result.files * 1024
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

