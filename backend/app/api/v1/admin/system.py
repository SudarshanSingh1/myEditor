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

# --- System Settings ---
@router.get("/system-settings", response_model=SuccessResponse)
def get_system_settings(db: Session = Depends(get_db), admin: User = Depends(require_permission('system.maintenance.toggle'))):
    settings_row = db.query(SystemSettings).first()
    if not settings_row:
        settings_row = SystemSettings()
        db.add(settings_row)
        db.commit()
        db.refresh(settings_row)
    
    # Auto-disable maintenance mode if time has passed
    if getattr(settings_row, "maintenance_mode", False) and getattr(settings_row, "maintenance_end_time", None):
        end_time = settings_row.maintenance_end_time
        if end_time.tzinfo is None:
            end_time = end_time.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > end_time:
            settings_row.maintenance_mode = False
            settings_row.maintenance_end_time = None
            db.commit()
            db.refresh(settings_row)

    data = {
        "maintenance_mode": getattr(settings_row, "maintenance_mode", False),
        "maintenance_message": getattr(settings_row, "maintenance_message", None),
        "maintenance_end_time": settings_row.maintenance_end_time.isoformat() if getattr(settings_row, "maintenance_end_time", None) else None,
        "maintenance_allow_admin_access": getattr(settings_row, "maintenance_allow_admin_access", True),
        "maintenance_show_countdown": getattr(settings_row, "maintenance_show_countdown", True),
        "registration_enabled": getattr(settings_row, "registration_enabled", True),
        "login_enabled": getattr(settings_row, "login_enabled", True),
        "read_only_mode": getattr(settings_row, "read_only_mode", False),
        "max_execution_time_seconds": getattr(settings_row, "max_execution_time_seconds", 30),
        "max_memory_mb": getattr(settings_row, "max_memory_mb", 256),
        "max_file_size_mb": getattr(settings_row, "max_file_size_mb", 10),
        "max_projects_per_user": getattr(settings_row, "max_projects_per_user", 20),
        "rate_limit_per_minute": getattr(settings_row, "rate_limit_per_minute", 60),
        "queue_limits": getattr(settings_row, "queue_limits", 1000),
        "worker_limits": getattr(settings_row, "worker_limits", 10),
        "retention_days": getattr(settings_row, "retention_days", 30),
        "feature_flags": getattr(settings_row, "feature_flags", {}),
        "app_name": getattr(settings_row, "app_name", "Hamara Editor"),
        "default_timezone": getattr(settings_row, "default_timezone", "UTC"),
        "oauth_google_enabled": getattr(settings_row, "oauth_google_enabled", False),
        "oauth_google_client_id": getattr(settings_row, "oauth_google_client_id", None),
        "oauth_google_client_secret": "********" if getattr(settings_row, "oauth_google_client_secret", None) else None,
        "oauth_github_enabled": getattr(settings_row, "oauth_github_enabled", False),
        "oauth_github_client_id": getattr(settings_row, "oauth_github_client_id", None),
        "oauth_github_client_secret": "********" if getattr(settings_row, "oauth_github_client_secret", None) else None,
        "smtp_host": getattr(settings_row, "smtp_host", None),
        "smtp_port": getattr(settings_row, "smtp_port", 587),
        "smtp_user": getattr(settings_row, "smtp_user", None),
        "smtp_pass": "********" if getattr(settings_row, "smtp_pass", None) else None,
        "smtp_from_name": getattr(settings_row, "smtp_from_name", "Hamara Editor"),
        "smtp_from_email": getattr(settings_row, "smtp_from_email", None),
        "smtp_tls": getattr(settings_row, "smtp_tls", True),
        "smtp_ssl": getattr(settings_row, "smtp_ssl", False),
    }
    return SuccessResponse(message="Settings retrieved.", data=data)

@router.put("/system-settings", response_model=SuccessResponse)
def update_system_settings(req: SystemSettingsUpdate, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_permission('system.maintenance.toggle'))):
    settings_row = db.query(SystemSettings).first()
    if not settings_row:
        settings_row = SystemSettings()
        db.add(settings_row)
        
    # Legacy migration: if smtp_pass is plaintext, encrypt it once
    db_pass = getattr(settings_row, "smtp_pass", None)
    if db_pass:
        try:
            Fernet(get_fernet_key()).decrypt(db_pass.encode())
        except Exception:
            # InvalidToken: it's plaintext. Encrypt and save.
            setattr(settings_row, "smtp_pass", encrypt_string(db_pass))
            db.commit()
            
    changes = {}
    smtp_fields = ["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from_name", "smtp_from_email", "smtp_tls", "smtp_ssl"]
    oauth_fields = ["oauth_google_enabled", "oauth_google_client_id", "oauth_google_client_secret", "oauth_github_enabled", "oauth_github_client_id", "oauth_github_client_secret"]
    fields = [
        "app_name", "default_timezone",
        "maintenance_mode", "maintenance_message", "maintenance_end_time", "maintenance_allow_admin_access", "maintenance_show_countdown",
        "registration_enabled", "login_enabled", "read_only_mode",
        "max_execution_time_seconds", "max_memory_mb", "max_file_size_mb", "max_projects_per_user", "rate_limit_per_minute",
        "queue_limits", "worker_limits", "retention_days", "feature_flags"
    ] + smtp_fields + oauth_fields
    
    should_validate_smtp = False
    for f in smtp_fields:
        req_val = getattr(req, f, None)
        if req_val is not None:
            if f == "smtp_pass" and req_val == "********":
                continue
            # Passwords need special check since DB is encrypted
            if f == "smtp_pass":
                if req_val != decrypt_string(getattr(settings_row, "smtp_pass", None)):
                    should_validate_smtp = True
                    break
            elif req_val != getattr(settings_row, f, None):
                should_validate_smtp = True
                break
                
    if getattr(req, "smtp_pass", None) == "********":
        req.smtp_pass = None # Ignore dummy password from frontend
    if getattr(req, "oauth_google_client_secret", None) == "********":
        req.oauth_google_client_secret = None
    if getattr(req, "oauth_github_client_secret", None) == "********":
        req.oauth_github_client_secret = None
    if should_validate_smtp:
        # Determine the effective SMTP settings for validation
        test_host = req.smtp_host if req.smtp_host is not None else getattr(settings_row, "smtp_host", None)
        test_port = req.smtp_port if req.smtp_port is not None else getattr(settings_row, "smtp_port", 587)
        test_user = req.smtp_user if req.smtp_user is not None else getattr(settings_row, "smtp_user", None)
        
        # Determine password: if newly provided, use plaintext. Else, decrypt existing from DB.
        if req.smtp_pass is not None:
            test_pass = req.smtp_pass
        else:
            test_pass = decrypt_string(getattr(settings_row, "smtp_pass", None))
            
        test_tls = req.smtp_tls if req.smtp_tls is not None else getattr(settings_row, "smtp_tls", True)
        test_ssl = req.smtp_ssl if req.smtp_ssl is not None else getattr(settings_row, "smtp_ssl", False)
        
        if test_host:
            try:
                if test_ssl:
                    server = smtplib.SMTP_SSL(test_host, test_port, timeout=10)
                else:
                    server = smtplib.SMTP(test_host, test_port, timeout=10)
                    if test_tls:
                        server.starttls()
                
                if test_user and test_pass:
                    server.login(test_user, test_pass)
                server.quit()
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"SMTP Validation Failed: {str(e)}")

    # Encrypt password before saving if a new one was provided
    if req.smtp_pass is not None:
        req.smtp_pass = encrypt_string(req.smtp_pass)
        
    if req.oauth_google_client_secret is not None:
        req.oauth_google_client_secret = encrypt_string(req.oauth_google_client_secret)
        
    if req.oauth_github_client_secret is not None:
        req.oauth_github_client_secret = encrypt_string(req.oauth_github_client_secret)

    update_data = req.model_dump(exclude_unset=True) if hasattr(req, "model_dump") else req.dict(exclude_unset=True)
    
    # Auto-clear maintenance end time when turning off maintenance
    if update_data.get("maintenance_mode") is False:
        update_data["maintenance_end_time"] = None

    for field in fields:
        if field in update_data:
            val = update_data[field]
            if field == "maintenance_end_time":
                if not val:
                    setattr(settings_row, field, None)
                    changes[field] = None
                else:
                    try:
                        dt = datetime.fromisoformat(val.replace("Z", "+00:00"))
                        setattr(settings_row, field, dt)
                        changes[field] = dt.isoformat()
                    except ValueError:
                        pass
            elif hasattr(settings_row, field):
                setattr(settings_row, field, val)
                changes[field] = val
            
    db.commit()
    db.refresh(settings_row)
    
    if changes:
        AuditService.log_action(db, admin.id, "UPDATE_SYSTEM_SETTINGS", request.client.host, request.headers.get("user-agent"), changes)
        
    return SuccessResponse(message="Settings updated.", data=changes)

# --- Audit Logs ---
from fastapi import Response
from typing import Optional
import csv
import io
from datetime import datetime

@router.get("/audit", response_model=SuccessResponse)
def get_audit_logs(
    skip: int = 0, limit: int = 50,
    action: Optional[str] = None,
    username: Optional[str] = None,
    ip_address: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db), admin: User = Depends(require_permission('system.maintenance.toggle'))
):
    query = db.query(AuditLog, User.username).outerjoin(User, AuditLog.user_id == User.id)
    
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if username:
        query = query.filter(User.username.ilike(f"%{username}%"))
    if ip_address:
        query = query.filter(AuditLog.ip_address.ilike(f"%{ip_address}%"))
    if start_date:
        try:
            query = query.filter(AuditLog.created_at >= datetime.fromisoformat(start_date))
        except ValueError:
            pass
    if end_date:
        try:
            query = query.filter(AuditLog.created_at <= datetime.fromisoformat(end_date))
        except ValueError:
            pass

    total = query.count()
    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    
    log_list = []
    for log, un in logs:
        log_list.append({
            "id": str(log.id), "action": log.action, "username": un or "Unknown",
            "ip_address": log.ip_address, "details": log.details, "created_at": log.created_at
        })
        
    return SuccessResponse(message="Audit logs retrieved", data={"items": log_list, "total": total})

@router.get("/audit/export")
def export_audit_logs(
    format: str = "csv",
    action: Optional[str] = None,
    username: Optional[str] = None,
    ip_address: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db), admin: User = Depends(require_permission('system.maintenance.toggle'))
):
    query = db.query(AuditLog, User.username).outerjoin(User, AuditLog.user_id == User.id)
    
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if username:
        query = query.filter(User.username.ilike(f"%{username}%"))
    if ip_address:
        query = query.filter(AuditLog.ip_address.ilike(f"%{ip_address}%"))
    if start_date:
        try:
            query = query.filter(AuditLog.created_at >= datetime.fromisoformat(start_date))
        except ValueError:
            pass
    if end_date:
        try:
            query = query.filter(AuditLog.created_at <= datetime.fromisoformat(end_date))
        except ValueError:
            pass

    logs = query.order_by(AuditLog.created_at.desc()).limit(10000).all() # Cap at 10k for safety

    if format == "json":
        # JSON export: load up to 5 000 rows into memory (reasonable for JSON download)
        logs = query.order_by(AuditLog.created_at.desc()).limit(5000).all()
        log_list = [
            {
                "id": str(log.id), "action": log.action, "username": un or "Unknown",
                "ip_address": log.ip_address, "details": log.details,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log, un in logs
        ]
        return log_list
    else:
        # CSV export: stream in batches of 500 rows — never holds >500 rows in memory
        # regardless of total table size.
        BATCH = 500

        def _csv_row_generator():
            header = io.StringIO()
            w = csv.writer(header)
            w.writerow(["ID", "Timestamp", "Action", "Username", "IP Address", "Details"])
            yield header.getvalue()

            offset = 0
            while True:
                batch = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(BATCH).all()
                if not batch:
                    break
                buf = io.StringIO()
                w = csv.writer(buf)
                for log, un in batch:
                    w.writerow([
                        str(log.id),
                        log.created_at.isoformat() if log.created_at else "",
                        log.action,
                        un or "Unknown",
                        log.ip_address or "",
                        str(log.details),
                    ])
                yield buf.getvalue()
                offset += BATCH
                if len(batch) < BATCH:
                    break  # last page

        from fastapi.responses import StreamingResponse as _StreamingResponse
        return _StreamingResponse(
            _csv_row_generator(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=audit_export.csv"},
        )

# --- Feedback Management ---
@router.get("/feedback", response_model=SuccessResponse)
def get_feedback(
    skip: int = 0, limit: int = 50,
    db: Session = Depends(get_db), admin: User = Depends(require_permission('users.read.basic'))
):
    total = db.query(Feedback).count()
    feedback_items = db.query(Feedback, User.username).outerjoin(User, Feedback.user_id == User.id).order_by(Feedback.created_at.desc()).offset(skip).limit(limit).all()
    data = []
    for f, un in feedback_items:
        data.append({
            "id": str(f.id), "category": f.category, "subject": f.subject,
            "status": f.status, "rating": f.rating, "created_at": f.created_at,
            "username": un or "Anonymous", "priority": f.priority,
            "description": getattr(f, "description", ""),
        })
    return SuccessResponse(message="Feedback retrieved", data={"items": data, "total": total})

@router.patch("/feedback/{feedback_id}", response_model=SuccessResponse)
def update_feedback_status(
    feedback_id: uuid.UUID, req: FeedbackStatusUpdate, request: Request,
    db: Session = Depends(get_db), admin: User = Depends(require_permission('users.read.basic'))
):
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
        
    old_status = feedback.status
    feedback.status = req.status
    db.commit()
    
    AuditService.log_action(db, admin.id, "UPDATE_FEEDBACK_STATUS", request.client.host, request.headers.get("user-agent"), {"feedback_id": str(feedback_id), "old_status": old_status, "new_status": req.status})
    return SuccessResponse(message="Status updated")

@router.delete("/feedback/{feedback_id}", response_model=SuccessResponse)
def delete_feedback(
    feedback_id: str,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("system.settings"))
):
    fb = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    db.delete(fb)
    db.commit()
    
    AuditService.log_action(db, admin.id, "DELETE_FEEDBACK", request.client.host, request.headers.get("user-agent"), {"feedback_id": feedback_id})
    return SuccessResponse(message="Feedback deleted successfully")

# --- Errors ---
@router.get("/errors", response_model=SuccessResponse)
def get_errors(
    skip: int = 0, limit: int = 50,
    db: Session = Depends(get_db), admin: User = Depends(require_permission('users.read.basic'))
):
    total = db.query(SystemError).count()
    errors = db.query(SystemError).order_by(SystemError.created_at.desc()).offset(skip).limit(limit).all()
    
    items = []
    for e in errors:
        items.append({
            "id": str(e.id),
            "route": getattr(e, "route", None),
            "error_type": str(getattr(e, "error_type", "UNKNOWN")),
            "message": getattr(e, "message", str(e)),
            "stack_trace": getattr(e, "stack_trace", None),
            "user_id": str(e.user_id) if getattr(e, "user_id", None) else None,
            "browser": getattr(e, "browser", None),
            "created_at": e.created_at,
        })
    
    return SuccessResponse(message="Errors retrieved", data={"items": items, "total": total})

@router.delete("/errors/{error_id}", response_model=SuccessResponse)
def delete_system_error(
    error_id: str,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("system.settings"))
):
    err = db.query(SystemError).filter(SystemError.id == error_id).first()
    if not err:
        raise HTTPException(status_code=404, detail="Error not found")
    
    db.delete(err)
    db.commit()
    
    AuditService.log_action(db, admin.id, "DELETE_SYSTEM_ERROR", request.client.host, request.headers.get("user-agent"), {"error_id": error_id})
    return SuccessResponse(message="System error deleted successfully")


# --- Emails ---
@router.get("/emails", response_model=SuccessResponse)
def get_email_logs(
    skip: int = 0, limit: int = 50,
    db: Session = Depends(get_db), admin: User = Depends(require_permission('system.maintenance.toggle'))
):
    total = db.query(EmailLog).count()
    logs = db.query(EmailLog).order_by(EmailLog.created_at.desc()).offset(skip).limit(limit).all()
    
    items = []
    for log in logs:
        items.append({
            "id": str(log.id),
            "recipient": log.recipient,
            "subject": log.subject,
            "user_role": getattr(log.user_role, 'value', log.user_role) if log.user_role else None,
            "status": getattr(log.status, 'value', log.status),
            "provider": log.provider,
            "error_message": log.error_message,
            "sent_at": log.sent_at,
            "created_at": log.created_at,
        })
    return SuccessResponse(message="Email logs retrieved", data={"items": items, "total": total})

@router.post("/emails/{log_id}/retry", response_model=SuccessResponse)
def retry_email_log(
    log_id: str,
    db: Session = Depends(get_db), 
    admin: User = Depends(require_permission('system.maintenance.toggle'))
):
    log = db.query(EmailLog).filter(EmailLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Email log not found")
        
    raise HTTPException(
        status_code=501, 
        detail="Automatic email retries require payload storage, which is currently not implemented."
    )

# --- Maintenance ---
@router.get("/maintenance", response_model=SuccessResponse)
def get_maintenance_config(db: Session = Depends(get_db), admin: User = Depends(require_permission('system.maintenance.toggle'))):
    settings_row = db.query(SystemSettings).first()
    if not settings_row:
        settings_row = SystemSettings()
        db.add(settings_row)
        db.commit()
        db.refresh(settings_row)
    
    return SuccessResponse(message="Maintenance config retrieved", data={
        "maintenance_mode": settings_row.maintenance_mode,
        "maintenance_message": settings_row.maintenance_message,
        "maintenance_end_time": settings_row.maintenance_end_time.isoformat() if settings_row.maintenance_end_time else None,
        "maintenance_allow_admin_access": settings_row.maintenance_allow_admin_access,
        "maintenance_show_countdown": settings_row.maintenance_show_countdown,
    })

@router.put("/maintenance", response_model=SuccessResponse)
def update_maintenance_config(
    req: MaintenanceConfigRequest, request: Request,
    db: Session = Depends(get_db), admin: User = Depends(require_permission('system.maintenance.toggle'))
):
    settings_row = db.query(SystemSettings).first()
    if not settings_row:
        settings_row = SystemSettings()
        db.add(settings_row)
    
    changes = {}
    fields = ["maintenance_mode", "maintenance_message", "maintenance_end_time", "maintenance_allow_admin_access", "maintenance_show_countdown"]
    
    # Use model_dump(exclude_unset=True) to get fields that were actually sent, including None
    update_data = req.model_dump(exclude_unset=True) if hasattr(req, "model_dump") else req.dict(exclude_unset=True)
    
    # Auto-clear maintenance end time when turning off maintenance
    if update_data.get("maintenance_mode") is False:
        update_data["maintenance_end_time"] = None
        
    for field in fields:
        if field in update_data:
            val = update_data[field]
            setattr(settings_row, field, val)
            changes[field] = val
            
    if changes:
        settings_row.updated_by_id = admin.id
        db.commit()
        db.refresh(settings_row)
        AuditService.log_action(db, admin.id, "UPDATE_MAINTENANCE_CONFIG", request.client.host, request.headers.get("user-agent"), changes)
        
    return SuccessResponse(message="Maintenance config updated", data=changes)



@router.post("/emails/test", response_model=SuccessResponse)
def send_test_email(
    request: Request,
    db: Session = Depends(get_db), admin: User = Depends(require_permission('system.maintenance.toggle'))
):
    try:
        from app.services.email_service import EmailService
        EmailService.send_test_email(str(admin.id))
        return SuccessResponse(message="Email sent successfully")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

