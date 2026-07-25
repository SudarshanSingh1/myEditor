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

# --- Users ---
@router.get("/users", response_model=SuccessResponse)
def get_users(
    skip: int = 0, limit: int = 50, search: str = None, role: str = None,
    status: str = None, is_deleted: bool = None, sort_by: str = "created_at", sort_dir: str = "desc",
    db: Session = Depends(get_db), admin: User = Depends(require_permission('users.read.basic'))
):
    query = db.query(User)
    if search:
        query = query.filter((User.username.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%")))
    if role:
        query = query.filter(User.role == role)
    if status:
        query = query.filter(User.status == status)
    if is_deleted is not None:
        query = query.filter(User.is_deleted == is_deleted)
        
    total = query.count()
    
    if sort_by == "username":
        order_col = User.username.desc() if sort_dir == "desc" else User.username.asc()
    elif sort_by == "email":
        order_col = User.email.desc() if sort_dir == "desc" else User.email.asc()
    elif sort_by == "last_login":
        order_col = User.last_login.desc() if sort_dir == "desc" else User.last_login.asc()
    else:
        order_col = User.created_at.desc() if sort_dir == "desc" else User.created_at.asc()
        
    users = query.order_by(order_col).offset(skip).limit(limit).all()
    
    safe_users = []
    for u in users:
        projects_count = db.query(Project).filter(Project.owner_id == u.id).count()
        safe_users.append({
            "id": str(u.id), "username": u.username, "email": u.email, "role": u.role,
            "status": u.status, "created_at": u.created_at, "last_login": u.last_login,
            "projects_count": projects_count, "is_deleted": u.is_deleted,
            "failed_login_attempts": u.failed_login_attempts
        })
        
    return SuccessResponse(message="Users retrieved", data={"items": safe_users, "total": total})

class UserActionRequest(BaseModel):
    action: str # suspend, unsuspend, ban, restore, force_logout, reset_mfa
    reason: str | None = None

class BulkUserActionRequest(BaseModel):
    user_ids: list[uuid.UUID]
    action: str
    reason: str | None = None

@router.get("/users/{user_id}/details", response_model=SuccessResponse)
def get_user_details(
    user_id: uuid.UUID,
    db: Session = Depends(get_db), admin: User = Depends(require_permission('users.read.basic'))
):
    from app.models.oauth_account import OAuthAccount
    from app.models.user_session import UserSession
    from app.models.workspace import File
    
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Stats
    projects_count = db.query(Project).filter(Project.owner_id == u.id).count()
    
    # Calculate storage size
    storage_used = 0
    project_ids = [p.id for p in db.query(Project.id).filter(Project.owner_id == u.id).all()]
    if project_ids:
        storage_row = db.query(func.sum(File.size)).filter(File.project_id.in_(project_ids)).first()
        storage_used = storage_row[0] if storage_row[0] else 0

    # OAuth
    oauth_accounts = db.query(OAuthAccount).filter(OAuthAccount.user_id == u.id).all()
    github_connected = any(acc.provider == "github" for acc in oauth_accounts)
    
    # Sessions
    sessions = db.query(UserSession).filter(UserSession.user_id == u.id).order_by(UserSession.last_active_at.desc()).limit(10).all()
    session_data = [{
        "ip_address": s.ip_address,
        "browser": s.browser,
        "os": s.os,
        "device_type": s.device_type,
        "is_active": s.is_active,
        "last_active_at": s.last_active_at
    } for s in sessions]
    
    # Warnings/Audit Logs for user
    recent_audits = db.query(AuditLog).filter(AuditLog.user_id == u.id).order_by(AuditLog.created_at.desc()).limit(10).all()
    audit_data = [{
        "action": a.action,
        "created_at": a.created_at,
        "ip_address": a.ip_address
    } for a in recent_audits]

    return SuccessResponse(message="User details retrieved", data={
        "id": str(u.id), "username": u.username, "email": u.email, "role": u.role,
        "status": u.status, "created_at": u.created_at, "last_login": u.last_login,
        "projects_count": projects_count, "is_deleted": u.is_deleted,
        "storage_used_bytes": storage_used,
        "github_connected": github_connected,
        "failed_login_attempts": u.failed_login_attempts,
        "totp_enabled": u.totp_enabled,
        "sessions": session_data,
        "recent_audits": audit_data
    })

@router.post("/users/{user_id}/actions", response_model=SuccessResponse)
def perform_user_action(
    user_id: uuid.UUID, req: UserActionRequest, request: Request,
    db: Session = Depends(get_db), admin: User = Depends(require_permission('users.delete'))
):
    from app.models.user_session import UserSession
    
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
        
    if u.role == RoleEnum.OWNER and admin.role != RoleEnum.OWNER:
        raise HTTPException(status_code=403, detail="Cannot perform actions on an Owner")
        
    action_log = req.action.upper()
    
    if req.action == "suspend":
        u.status = StatusEnum.SUSPENDED
    elif req.action == "unsuspend":
        u.status = StatusEnum.ACTIVE
    elif req.action == "ban":
        u.status = StatusEnum.BANNED
    elif req.action == "restore":
        u.status = StatusEnum.ACTIVE
        u.is_deleted = False
    elif req.action == "force_logout":
        db.query(UserSession).filter(UserSession.user_id == u.id).update({"is_active": False})
    elif req.action == "reset_mfa":
        u.totp_secret = None
        u.totp_enabled = False
        u.recovery_codes = None
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {req.action}")
        
    db.commit()
    
    AuditService.log_action(db, admin.id, f"USER_ACTION_{action_log}", request.client.host, request.headers.get("user-agent"), {"target_user_id": str(user_id), "reason": req.reason})
    
    return SuccessResponse(message=f"Action '{req.action}' performed successfully")

@router.post("/users/bulk-actions", response_model=SuccessResponse)
def perform_bulk_user_action(
    req: BulkUserActionRequest, request: Request,
    db: Session = Depends(get_db), admin: User = Depends(require_permission('users.delete'))
):
    from app.models.user_session import UserSession
    
    users = db.query(User).filter(User.id.in_(req.user_ids)).all()
    if not users:
        raise HTTPException(status_code=404, detail="No users found")
        
    action_log = req.action.upper()
    modified_count = 0
    
    for u in users:
        if u.role == RoleEnum.OWNER and admin.role != RoleEnum.OWNER:
            continue
            
        if req.action == "suspend":
            u.status = StatusEnum.SUSPENDED
        elif req.action == "unsuspend":
            u.status = StatusEnum.ACTIVE
        elif req.action == "ban":
            u.status = StatusEnum.BANNED
        elif req.action == "restore":
            u.status = StatusEnum.ACTIVE
            u.is_deleted = False
        elif req.action == "force_logout":
            db.query(UserSession).filter(UserSession.user_id == u.id).update({"is_active": False})
        elif req.action == "reset_mfa":
            u.totp_secret = None
            u.totp_enabled = False
            u.recovery_codes = None
            
        modified_count += 1
        
    db.commit()
    
    AuditService.log_action(db, admin.id, f"BULK_USER_ACTION_{action_log}", request.client.host, request.headers.get("user-agent"), {"target_count": modified_count, "action": req.action, "reason": req.reason})
    
    return SuccessResponse(message=f"Bulk action '{req.action}' performed on {modified_count} users")


@router.post("/users/create", response_model=SuccessResponse)
def create_admin_user(
    req: CreateUserRequest, request: Request, background_tasks: BackgroundTasks,
    db: Session = Depends(get_db), admin: User = Depends(require_permission('users.delete'))
):
    # Only OWNER can create OWNER
    if req.role == RoleEnum.OWNER and admin.role != RoleEnum.OWNER:
        raise HTTPException(status_code=403, detail="Only an Owner can create another Owner.")
    # ADMIN cannot create ADMIN unless they are OWNER
    if req.role == RoleEnum.ADMIN and admin.role not in [RoleEnum.ADMIN, RoleEnum.OWNER]:
        raise HTTPException(status_code=403, detail="Insufficient permissions to create this role.")
    
    existing = db.query(User).filter((User.email == req.email) | (User.username == req.username)).first()
    if existing:
        raise HTTPException(status_code=409, detail="User with this email or username already exists.")
    
    # Generate temporary password
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    temp_password = ''.join(secrets.choice(alphabet) for i in range(16))
    
    hashed = get_password_hash(temp_password)
    new_user = User(
        username=req.username,
        email=req.email,
        password_hash=hashed,
        role=req.role,
        status=StatusEnum.ACTIVE,
        must_change_password=True,
        temp_password_expires_at=datetime.now(timezone.utc) + timedelta(days=1)
    )
    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="User with this email or username already exists.")
    
    AuditService.log_action(db, admin.id, "CREATE_USER", request.client.host, request.headers.get("user-agent"), {"new_user_id": str(new_user.id), "role": req.role})
    
    # Handle email delivery synchronously if checked
    login_url = f"{settings.FRONTEND_URL}/login"
    email_status_msg = ""
    if req.send_email:
        try:
            from app.services.email_service import EmailService
            EmailService.send_welcome_email(str(new_user.id), temp_password, login_url)
            email_status_msg = "Credentials emailed."
        except Exception:
            # Don't rollback user creation if email fails
            email_status_msg = "Email delivery failed."
    
    return SuccessResponse(message=f"User created successfully. {email_status_msg}".strip(), data={"id": str(new_user.id)})

@router.post("/users/{user_id}/resend-credentials", response_model=SuccessResponse)
def resend_credentials(
    user_id: uuid.UUID, request: Request,
    db: Session = Depends(get_db), admin: User = Depends(require_permission('users.delete'))
):
    target_user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    temp_password = ''.join(secrets.choice(alphabet) for i in range(16))
    
    target_user.password_hash = get_password_hash(temp_password)
    target_user.must_change_password = True
    target_user.temp_password_expires_at = datetime.now(timezone.utc) + timedelta(days=1)
    db.commit()
    
    AuditService.log_action(db, admin.id, "RESEND_CREDENTIALS", request.client.host, request.headers.get("user-agent"), {"target_user_id": str(target_user.id)})
    
    login_url = f"{settings.FRONTEND_URL}/login"
    try:
        from app.services.email_service import EmailService
        EmailService.send_welcome_email(str(target_user.id), temp_password, login_url)
        return SuccessResponse(message="Credentials sent successfully.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Email delivery failed: {str(e)}")

@router.post("/users/{user_id}/send-email", response_model=SuccessResponse)
def send_email_to_user(
    user_id: uuid.UUID, req: SendEmailRequest, request: Request, background_tasks: BackgroundTasks,
    db: Session = Depends(get_db), admin: User = Depends(require_permission('users.delete'))
):
    target_user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    background_tasks.add_task(EmailService.send_custom_email, str(target_user.id), req.subject, req.message)
    
    AuditService.log_action(db, admin.id, "MANUAL_EMAIL_SENT", request.client.host, request.headers.get("user-agent"), {"user_id": str(user_id), "subject": req.subject})
    
    return SuccessResponse(message="Email queued for sending.")

@router.patch("/users/{user_id}/role", response_model=SuccessResponse)
def update_user_role(
    user_id: uuid.UUID, req: UserRoleUpdate, request: Request,
    db: Session = Depends(get_db), admin: User = Depends(require_moderator)
):
    target_user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if admin.role == RoleEnum.MODERATOR:
        if req.role != RoleEnum.USER:
            raise HTTPException(status_code=403, detail="Moderators can only assign User roles.")
        if target_user.role in [RoleEnum.MODERATOR, RoleEnum.ADMIN, RoleEnum.OWNER]:
            raise HTTPException(status_code=403, detail="Moderators cannot change roles of privileged users.")
            
    if admin.role == RoleEnum.ADMIN:
        if req.role not in [RoleEnum.USER, RoleEnum.MODERATOR]:
            raise HTTPException(status_code=403, detail="Admins can only assign User or Moderator roles.")
        if target_user.role in [RoleEnum.ADMIN, RoleEnum.OWNER] and admin.id != target_user.id:
            raise HTTPException(status_code=403, detail="Admins cannot change the role of Admins or Owners.")

    if target_user.role == RoleEnum.OWNER and admin.id != target_user.id:
        raise HTTPException(status_code=403, detail="Cannot edit an Owner")
        
    if target_user.role == RoleEnum.OWNER and req.role != RoleEnum.OWNER:
        super_admin_count = db.query(User).filter(User.role == RoleEnum.OWNER, User.is_deleted == False).count()
        if super_admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot downgrade the last Owner account.")
            
    if target_user.role in [RoleEnum.ADMIN, RoleEnum.OWNER] and req.role not in [RoleEnum.ADMIN, RoleEnum.OWNER]:
        admin_count = db.query(User).filter(User.role.in_([RoleEnum.ADMIN, RoleEnum.OWNER]), User.is_deleted == False).count()
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot downgrade the last administrator.")
            
    old_role = target_user.role
    target_user.role = req.role
    
    # Recalculate effective permissions immediately
    from app.models.role_permission import RolePermission
    from app.models.permission import Permission
    if req.role != RoleEnum.OWNER:
        perms = db.query(Permission.node).join(RolePermission).filter(RolePermission.role == req.role).all()
        target_user.effective_permissions = [p[0] for p in perms]
    else:
        target_user.effective_permissions = []
        
    db.commit()
    
    AuditService.log_action(db, admin.id, "UPDATE_USER_ROLE", request.client.host, request.headers.get("user-agent"), {"user_id": str(user_id), "old_role": old_role, "new_role": req.role})
    return SuccessResponse(message="Role updated", data={"id": str(user_id), "role": req.role})


@router.patch("/users/{user_id}/status", response_model=SuccessResponse)
def update_user_status(
    user_id: uuid.UUID, req: UserStatusUpdate, request: Request,
    db: Session = Depends(get_db), admin: User = Depends(require_admin)
):
    target_user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if target_user.role == RoleEnum.OWNER and admin.role != RoleEnum.OWNER:
        raise HTTPException(status_code=403, detail="Cannot edit an Owner")
        
    if admin.role == RoleEnum.ADMIN and target_user.role == RoleEnum.ADMIN and admin.id != target_user.id:
        raise HTTPException(status_code=403, detail="Admins cannot change the status of other Admins.")
        
    old_status = target_user.status
    target_user.status = req.status
    db.commit()
    
    AuditService.log_action(db, admin.id, "UPDATE_USER_STATUS", request.client.host, request.headers.get("user-agent"), {"user_id": str(user_id), "old_status": old_status, "new_status": req.status})
    return SuccessResponse(message="Status updated", data={"id": str(user_id), "status": req.status})

@router.delete("/users/{user_id}", response_model=SuccessResponse)
def delete_user(
    user_id: uuid.UUID, request: Request,
    db: Session = Depends(get_db), admin: User = Depends(require_permission('system.maintenance.toggle'))
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account.")
        
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if target_user.role == RoleEnum.OWNER:
        super_admin_count = db.query(User).filter(User.role == RoleEnum.OWNER, User.is_deleted == False).count()
        if super_admin_count <= 1:
            raise HTTPException(status_code=403, detail="Cannot delete the last Owner account.")
    
    username_to_log = target_user.username
    
    # Manual cascade delete to ensure no IntegrityError from missing DB constraints
    try:
        from app.models.oauth_account import OAuthAccount
        from app.models.user_session import UserSession
        from app.models.feedback import Feedback
        from app.models.execution_log import ExecutionLog
        from app.models.audit_log import AuditLog
        from app.models.system_error import SystemError
        from app.models.project import Project
        from app.models.workspace import Folder, File, FileVersion
        from app.models.system_settings import SystemSettings
        
        db.query(SystemSettings).filter(SystemSettings.updated_by_id == target_user.id).update({"updated_by_id": None}, synchronize_session=False)
        db.query(OAuthAccount).filter(OAuthAccount.user_id == target_user.id).delete(synchronize_session=False)
        db.query(UserSession).filter(UserSession.user_id == target_user.id).delete(synchronize_session=False)
        db.query(Feedback).filter((Feedback.user_id == target_user.id) | (Feedback.assigned_to == target_user.id)).delete(synchronize_session=False)
        db.query(ExecutionLog).filter(ExecutionLog.user_id == target_user.id).delete(synchronize_session=False)
        db.query(AuditLog).filter(AuditLog.user_id == target_user.id).delete(synchronize_session=False)
        db.query(SystemError).filter(SystemError.user_id == target_user.id).delete(synchronize_session=False)
        db.query(FileVersion).filter(FileVersion.created_by == target_user.id).delete(synchronize_session=False)
        db.query(UserActivity).filter(UserActivity.user_id == target_user.id).delete(synchronize_session=False)
        
        projects = db.query(Project).filter(Project.owner_id == target_user.id).all()
        if projects:
            project_ids = [p.id for p in projects]
            db.query(ExecutionLog).filter(ExecutionLog.project_id.in_(project_ids)).delete(synchronize_session=False)
            files = db.query(File).filter(File.project_id.in_(project_ids)).all()
            if files:
                file_ids = [f.id for f in files]
                db.query(FileVersion).filter(FileVersion.file_id.in_(file_ids)).delete(synchronize_session=False)
            db.query(File).filter(File.project_id.in_(project_ids)).delete(synchronize_session=False)
            db.query(Folder).filter(Folder.project_id.in_(project_ids)).delete(synchronize_session=False)
            db.query(Project).filter(Project.owner_id == target_user.id).delete(synchronize_session=False)
    except Exception as e:
        from app.core.logger import logger
        logger.warning(f"Error during manual cascade delete for user {target_user.id}: {e}")
        # Proceed with db.delete and hope constraints handle it
        
    db.delete(target_user)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Cannot delete user due to foreign key constraints. DB must be manually cleaned: {str(e)}")
        
    AuditService.log_action(db, admin.id, "DELETE_USER", request.client.host, request.headers.get("user-agent"), {"user_id": str(user_id), "username": username_to_log})
    return SuccessResponse(message="User deleted")

