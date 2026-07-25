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

# --- Analytics ---
@router.get("/analytics/users-growth", response_model=SuccessResponse)
def get_users_growth(db: Session = Depends(get_db), admin: User = Depends(require_permission('users.read.basic'))):
    """Returns user registrations per day for last 30 days."""
    since = datetime.now(timezone.utc) - timedelta(days=30)
    rows = db.query(
        func.date(User.created_at).label("date"),
        func.count(User.id).label("count")
    ).filter(
        User.created_at >= since,
        User.is_deleted == False
    ).group_by(func.date(User.created_at)).order_by(func.date(User.created_at)).all()
    
    data = [{"date": str(r.date), "users": r.count} for r in rows]
    return SuccessResponse(message="Users growth retrieved", data={"items": data})

@router.get("/analytics/dau", response_model=SuccessResponse)
def get_daily_active_users(db: Session = Depends(get_db), admin: User = Depends(require_permission('users.read.basic'))):
    """Daily active users based on last_login per day for last 30 days."""
    since = datetime.now(timezone.utc) - timedelta(days=30)
    rows = db.query(
        func.date(User.last_login).label("date"),
        func.count(User.id).label("count")
    ).filter(
        User.last_login >= since,
        User.is_deleted == False
    ).group_by(func.date(User.last_login)).order_by(func.date(User.last_login)).all()
    
    data = [{"date": str(r.date), "dau": r.count} for r in rows]
    return SuccessResponse(message="DAU retrieved", data={"items": data})

@router.get("/analytics/executions", response_model=SuccessResponse)
def get_execution_trends(db: Session = Depends(get_db), admin: User = Depends(require_permission('users.read.basic'))):
    """Execution counts per day for last 30 days."""
    since = datetime.now(timezone.utc) - timedelta(days=30)
    rows = db.query(
        func.date(ExecutionLog.created_at).label("date"),
        func.count(ExecutionLog.id).label("count")
    ).filter(
        ExecutionLog.created_at >= since
    ).group_by(func.date(ExecutionLog.created_at)).order_by(func.date(ExecutionLog.created_at)).all()
    
    data = [{"date": str(r.date), "executions": r.count} for r in rows]
    return SuccessResponse(message="Execution trends retrieved", data={"items": data})

@router.get("/analytics/master-timeline", response_model=SuccessResponse)
def get_master_timeline(db: Session = Depends(get_db), admin: User = Depends(require_permission('users.read.basic'))):
    """Aggregate Registrations, Errors, and Executions across the same timeline (30 days)"""
    since = datetime.now(timezone.utc) - timedelta(days=30)
    
    # 1. Registrations
    users = db.query(func.date(User.created_at).label("date"), func.count(User.id).label("count")).filter(User.created_at >= since).group_by(func.date(User.created_at)).all()
    # 2. Executions
    execs = db.query(func.date(ExecutionLog.created_at).label("date"), func.count(ExecutionLog.id).label("count")).filter(ExecutionLog.created_at >= since).group_by(func.date(ExecutionLog.created_at)).all()
    # 3. Errors
    errors = db.query(func.date(SystemError.created_at).label("date"), func.count(SystemError.id).label("count")).filter(SystemError.created_at >= since).group_by(func.date(SystemError.created_at)).all()
    
    timeline_dict = {}
    
    for r in users:
        d = str(r.date)
        if d not in timeline_dict: timeline_dict[d] = {"date": d, "users": 0, "executions": 0, "errors": 0}
        timeline_dict[d]["users"] = r.count
        
    for r in execs:
        d = str(r.date)
        if d not in timeline_dict: timeline_dict[d] = {"date": d, "users": 0, "executions": 0, "errors": 0}
        timeline_dict[d]["executions"] = r.count
        
    for r in errors:
        d = str(r.date)
        if d not in timeline_dict: timeline_dict[d] = {"date": d, "users": 0, "executions": 0, "errors": 0}
        timeline_dict[d]["errors"] = r.count
        
    sorted_items = sorted(list(timeline_dict.values()), key=lambda x: x["date"])
    return SuccessResponse(message="Master timeline retrieved", data={"items": sorted_items})

@router.get("/analytics/languages", response_model=SuccessResponse)
def get_language_distribution(db: Session = Depends(get_db), admin: User = Depends(require_permission('users.read.basic'))):
    """Language distribution from projects."""
    rows = db.query(
        Project.language,
        func.count(Project.id).label("count")
    ).filter(
        Project.language.isnot(None)
    ).group_by(Project.language).order_by(func.count(Project.id).desc()).all()
    
    data = [{"language": r.language, "count": r.count} for r in rows]
    return SuccessResponse(message="Language distribution retrieved", data={"items": data})

@router.get("/analytics/execution-status", response_model=SuccessResponse)
def get_execution_status(db: Session = Depends(get_db), admin: User = Depends(require_permission('users.read.basic'))):
    """Execution success vs failure counts."""
    rows = db.query(
        ExecutionLog.status,
        func.count(ExecutionLog.id).label("count")
    ).group_by(ExecutionLog.status).all()
    
    data = [{"status": str(r.status), "count": r.count} for r in rows]
    return SuccessResponse(message="Execution status retrieved", data={"items": data})

@router.get("/analytics/feedback-ratings", response_model=SuccessResponse)
def get_feedback_ratings(db: Session = Depends(get_db), admin: User = Depends(require_permission('users.read.basic'))):
    """Feedback rating distribution."""
    rows = db.query(
        Feedback.rating,
        func.count(Feedback.id).label("count")
    ).filter(
        Feedback.rating.isnot(None)
    ).group_by(Feedback.rating).order_by(Feedback.rating).all()
    
    data = [{"rating": r.rating, "count": r.count} for r in rows]
    return SuccessResponse(message="Feedback ratings retrieved", data={"items": data})

@router.get("/analytics/feedback-resolution", response_model=SuccessResponse)
def get_feedback_resolution_timeline(db: Session = Depends(get_db), admin: User = Depends(require_permission('users.read.basic'))):
    """Open vs Resolved feedback over the last 30 days."""
    since = datetime.now(timezone.utc) - timedelta(days=30)
    
    rows = db.query(
        func.date(Feedback.created_at).label("date"),
        Feedback.status,
        func.count(Feedback.id).label("count")
    ).filter(
        Feedback.created_at >= since
    ).group_by(func.date(Feedback.created_at), Feedback.status).all()
    
    timeline_dict = {}
    
    for r in rows:
        d = str(r.date)
        if d not in timeline_dict:
            timeline_dict[d] = {"date": d, "open": 0, "resolved": 0}
            
        if r.status in [FeedbackStatus.COMPLETED, FeedbackStatus.REJECTED]:
            timeline_dict[d]["resolved"] += r.count
        else:
            timeline_dict[d]["open"] += r.count
            
    sorted_items = sorted(list(timeline_dict.values()), key=lambda x: x["date"])
    return SuccessResponse(message="Feedback resolution timeline retrieved", data={"items": sorted_items})

