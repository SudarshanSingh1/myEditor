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

# 4. GitHub Admin
@router.get("/github/dashboard", response_model=SuccessResponse)
def get_admin_github_dashboard(db: Session = Depends(get_db), admin: User = Depends(require_permission('users.read.basic'))):
    from app.models.oauth_account import OAuthAccount
    connected_accounts = db.query(OAuthAccount).filter(OAuthAccount.provider == "github").count()
    
    return SuccessResponse(message="GitHub dashboard retrieved", data={
        "connected_accounts": connected_accounts,
        "connected_repositories": 0,
        "sync_success_rate": 100.0 if connected_accounts > 0 else 0,
        "sync_failures": 0,
        "oauth_health": "Healthy"
    })

@router.get("/github/repositories", response_model=SuccessResponse)
def get_admin_github_repositories(db: Session = Depends(get_db), admin: User = Depends(require_permission('users.read.basic'))):
    return SuccessResponse(message="GitHub repositories retrieved", data={"items": [
        {"id": "1", "repository": "frontend-app", "owner": "john_doe", "branch": "main", "last_sync": datetime.now(timezone.utc).isoformat(), "sync_status": "Success"},
        {"id": "2", "repository": "backend-api", "owner": "jane_doe", "branch": "develop", "last_sync": datetime.now(timezone.utc).isoformat(), "sync_status": "Failed"}
    ]})

@router.post("/github/repositories/{repo_id}/sync", response_model=SuccessResponse)
def sync_admin_github_repository(repo_id: str, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_permission('users.update'))):
    AuditService.log_action(db, admin.id, "SYNC_GITHUB_REPO", request.client.host, request.headers.get("user-agent"), {"repo_id": repo_id})
    return SuccessResponse(message="Sync initiated")

@router.post("/github/repositories/{repo_id}/disconnect", response_model=SuccessResponse)
def disconnect_admin_github_repository(repo_id: str, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_permission('users.delete'))):
    AuditService.log_action(db, admin.id, "DISCONNECT_GITHUB_REPO", request.client.host, request.headers.get("user-agent"), {"repo_id": repo_id})
    return SuccessResponse(message="Repository disconnected")

@router.get("/reports/analytics", response_model=SuccessResponse)
def get_admin_reports_analytics(db: Session = Depends(get_db), admin: User = Depends(require_permission('users.read.basic'))):
    from app.models.report import Report
    total_reports = db.query(Report).count()
    
    return SuccessResponse(message="Analytics retrieved", data={
        "total_reports_generated": total_reports,
        "average_generation_time_seconds": 0.5,
        "most_requested_report_type": "User Activity" if total_reports > 0 else "None",
        "storage_used_mb": 0.1,
        "api_calls_to_report_engine": total_reports
    })
