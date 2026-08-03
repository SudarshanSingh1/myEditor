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
def get_workers(db: Session = Depends(get_db), admin: User = Depends(require_permission('system.containers.restart'))):
    items = []
    
    # Try Docker first — get real stats for each container
    try:
        import docker
        client = docker.from_env(timeout=3)
        containers = client.containers.list()
        for c in containers:
            try:
                # stream=False gives a single-shot stats snapshot (no need to iterate generator)
                stats = c.stats(stream=False)
                
                # --- CPU % ---
                cpu_delta = stats["cpu_stats"]["cpu_usage"]["total_usage"] - \
                            stats["precpu_stats"]["cpu_usage"]["total_usage"]
                system_delta = stats["cpu_stats"].get("system_cpu_usage", 0) - \
                               stats["precpu_stats"].get("system_cpu_usage", 0)
                num_cpus = stats["cpu_stats"].get("online_cpus") or \
                           len(stats["cpu_stats"]["cpu_usage"].get("percpu_usage", [1]))
                cpu_percent = round((cpu_delta / system_delta) * num_cpus * 100.0, 1) \
                              if system_delta > 0 else 0.0

                # --- Memory % ---
                mem_usage = stats["memory_stats"].get("usage", 0)
                mem_limit = stats["memory_stats"].get("limit", 1)
                # Subtract cached memory (Linux cgroups v1 reports cache in "stats" sub-key)
                cache = stats["memory_stats"].get("stats", {}).get("cache", 0)
                mem_used = max(mem_usage - cache, 0)
                mem_percent = round((mem_used / mem_limit) * 100.0, 1) if mem_limit > 0 else 0.0

                items.append({
                    "id": c.short_id,
                    "hostname": c.name,
                    "status": "online" if c.status == "running" else "offline",
                    "cpu_percent": cpu_percent,
                    "memory_percent": mem_percent,
                    "active_executions": 0,
                    "last_heartbeat": datetime.now(timezone.utc).isoformat()
                })
            except Exception as stats_err:
                # If stats fail for one container, still include it with zeroes
                items.append({
                    "id": c.short_id,
                    "hostname": c.name,
                    "status": "online" if c.status == "running" else "offline",
                    "cpu_percent": 0.0,
                    "memory_percent": 0.0,
                    "active_executions": 0,
                    "last_heartbeat": datetime.now(timezone.utc).isoformat()
                })
    except Exception:
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
            {"id": "worker-1", "hostname": "local-worker", "status": "online", "cpu_percent": 0.0, "memory_percent": 0.0, "active_executions": 0, "last_heartbeat": datetime.now(timezone.utc).isoformat()}
        ]
        
    return SuccessResponse(message="Workers retrieved", data={"items": items})

@router.post("/server/workers/{worker_id}/restart", response_model=SuccessResponse)
def restart_worker(worker_id: str, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_permission('system.maintenance.toggle'))):
    AuditService.log_action(db, admin.id, "RESTART_WORKER", request.client.host, request.headers.get("user-agent"), {"worker": worker_id})

    # Attempt real Docker container restart
    try:
        import docker
        client = docker.from_env(timeout=5)
        containers = client.containers.list(all=True)

        target = None
        for c in containers:
            if c.short_id == worker_id or c.name == worker_id or c.id == worker_id:
                target = c
                break

        if target is None:
            raise HTTPException(status_code=404, detail=f"Container '{worker_id}' not found. Use Docker CLI to restart manually.")

        target.restart(timeout=10)
        return SuccessResponse(message=f"Container '{target.name}' restarted successfully.")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Docker restart failed: {str(e)}. Restart '{worker_id}' manually via Docker CLI."
        )


