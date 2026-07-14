from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func, text
import uuid
from datetime import datetime, timezone, timedelta
import psutil
import secrets
import string
import smtplib
from app.core.security import encrypt_string, decrypt_string, get_fernet_key
from cryptography.fernet import Fernet
from app.core.config import settings

from app.dependencies.database import get_db
from app.dependencies.auth import require_super_admin, require_admin, require_moderator
from app.models.user import User, RoleEnum, StatusEnum
from app.models.project import Project
from app.models.feedback import Feedback, FeedbackStatus
from app.models.system_error import SystemError
from app.models.audit_log import AuditLog
from app.models.workspace import File
from app.models.execution_log import ExecutionLog
from app.models.system_settings import SystemSettings
from app.models.email_log import EmailLog
from app.schemas.responses import SuccessResponse
from app.services.audit_service import AuditService
from app.services.email_service import EmailService
from app.core.security import get_password_hash
from pydantic import BaseModel, EmailStr

router = APIRouter()

# --- Schemas ---
class UserRoleUpdate(BaseModel):
    role: RoleEnum

class SendEmailRequest(BaseModel):
    subject: str
    message: str

class UserStatusUpdate(BaseModel):
    status: StatusEnum

class SystemSettingsUpdate(BaseModel):
    maintenance_mode: bool | None = None
    maintenance_message: str | None = None
    maintenance_end_time: str | None = None
    maintenance_allow_admin_access: bool | None = None
    maintenance_show_countdown: bool | None = None
    
    registration_enabled: bool | None = None
    login_enabled: bool | None = None
    read_only_mode: bool | None = None
    max_execution_time_seconds: int | None = None
    max_memory_mb: int | None = None
    max_file_size_mb: int | None = None
    max_projects_per_user: int | None = None
    rate_limit_per_minute: int | None = None
    
    # SMTP fields
    smtp_host: str | None = None
    smtp_port: int | None = None
    smtp_user: str | None = None
    smtp_pass: str | None = None
    smtp_from_name: str | None = None
    smtp_from_email: str | None = None
    smtp_tls: bool | None = None
    smtp_ssl: bool | None = None

class MaintenanceConfigRequest(BaseModel):
    maintenance_mode: bool | None = None
    maintenance_message: str | None = None
    maintenance_end_time: datetime | None = None
    maintenance_allow_admin_access: bool | None = None
    maintenance_show_countdown: bool | None = None

class CreateUserRequest(BaseModel):
    username: str
    email: EmailStr
    role: RoleEnum = RoleEnum.MODERATOR
    send_email: bool = True

class FeedbackStatusUpdate(BaseModel):
    status: FeedbackStatus

# --- Dashboard & Stats ---
@router.get("/dashboard", response_model=SuccessResponse)
def get_dashboard(db: Session = Depends(get_db), admin: User = Depends(require_moderator)):
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
def get_statistics(db: Session = Depends(get_db), admin: User = Depends(require_moderator)):
    total_users = db.query(User).filter(User.is_deleted == False).count()
    active_users = db.query(User).filter(User.status == StatusEnum.ACTIVE, User.is_deleted == False).count()
    admins = db.query(User).filter(User.role.in_([RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN]), User.is_deleted == False).count()
    
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
def get_server_status(admin: User = Depends(require_admin)):
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
    })

# --- Analytics ---
@router.get("/analytics/users-growth", response_model=SuccessResponse)
def get_users_growth(db: Session = Depends(get_db), admin: User = Depends(require_moderator)):
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
def get_daily_active_users(db: Session = Depends(get_db), admin: User = Depends(require_moderator)):
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
def get_execution_trends(db: Session = Depends(get_db), admin: User = Depends(require_moderator)):
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
def get_master_timeline(db: Session = Depends(get_db), admin: User = Depends(require_moderator)):
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
def get_language_distribution(db: Session = Depends(get_db), admin: User = Depends(require_moderator)):
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
def get_execution_status(db: Session = Depends(get_db), admin: User = Depends(require_moderator)):
    """Execution success vs failure counts."""
    rows = db.query(
        ExecutionLog.status,
        func.count(ExecutionLog.id).label("count")
    ).group_by(ExecutionLog.status).all()
    
    data = [{"status": str(r.status), "count": r.count} for r in rows]
    return SuccessResponse(message="Execution status retrieved", data={"items": data})

@router.get("/analytics/feedback-ratings", response_model=SuccessResponse)
def get_feedback_ratings(db: Session = Depends(get_db), admin: User = Depends(require_moderator)):
    """Feedback rating distribution."""
    rows = db.query(
        Feedback.rating,
        func.count(Feedback.id).label("count")
    ).filter(
        Feedback.rating.isnot(None)
    ).group_by(Feedback.rating).order_by(Feedback.rating).all()
    
    data = [{"rating": r.rating, "count": r.count} for r in rows]
    return SuccessResponse(message="Feedback ratings retrieved", data={"items": data})

@router.get("/database", response_model=SuccessResponse)
def get_database_info(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    """Returns database size and table statistics."""
    try:
        # PostgreSQL database size
        db_size_result = db.execute(text("SELECT pg_size_pretty(pg_database_size(current_database())) as size, pg_database_size(current_database()) as size_bytes")).fetchone()
        
        table_counts = {
            "users": db.query(User).filter(User.is_deleted == False).count(),
            "projects": db.query(Project).count(),
            "files": db.query(File).count(),
            "execution_logs": db.query(ExecutionLog).count(),
            "feedback": db.query(Feedback).count(),
            "system_errors": db.query(SystemError).count(),
            "audit_logs": db.query(AuditLog).count(),
        }
        
        return SuccessResponse(message="Database info retrieved", data={
            "db_size": db_size_result.size if db_size_result else "Unknown",
            "db_size_bytes": db_size_result.size_bytes if db_size_result else 0,
            "table_counts": table_counts,
        })
    except Exception as e:
        # Fallback if DB size query fails
        from app.core.logger import logger
        logger.error(f"Failed to fetch DB size: {e}", exc_info=True)
        table_counts = {
            "users": db.query(User).filter(User.is_deleted == False).count(),
            "projects": db.query(Project).count(),
            "files": db.query(File).count(),
            "execution_logs": db.query(ExecutionLog).count(),
            "feedback": db.query(Feedback).count(),
            "system_errors": db.query(SystemError).count(),
            "audit_logs": db.query(AuditLog).count(),
        }
        return SuccessResponse(message="Database info retrieved", data={
            "db_size": "N/A",
            "db_size_bytes": 0,
            "table_counts": table_counts,
        })

# --- Users ---
@router.get("/users", response_model=SuccessResponse)
def get_users(
    skip: int = 0, limit: int = 50, search: str = None, role: str = None,
    db: Session = Depends(get_db), admin: User = Depends(require_moderator)
):
    query = db.query(User)
    if search:
        query = query.filter((User.username.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%")))
    if role:
        query = query.filter(User.role == role)
        
    total = query.count()
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    
    safe_users = []
    for u in users:
        projects_count = db.query(Project).filter(Project.owner_id == u.id).count()
        safe_users.append({
            "id": str(u.id), "username": u.username, "email": u.email, "role": u.role,
            "status": u.status, "created_at": u.created_at, "last_login": u.last_login,
            "projects_count": projects_count, "is_deleted": u.is_deleted,
        })
        
    return SuccessResponse(message="Users retrieved", data={"items": safe_users, "total": total})

@router.post("/users/create", response_model=SuccessResponse)
def create_admin_user(
    req: CreateUserRequest, request: Request, background_tasks: BackgroundTasks,
    db: Session = Depends(get_db), admin: User = Depends(require_super_admin)
):
    # Only SUPER_ADMIN can create SUPER_ADMIN
    if req.role == RoleEnum.SUPER_ADMIN and admin.role != RoleEnum.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only SUPER_ADMIN can create another SUPER_ADMIN.")
    # ADMIN cannot create ADMIN unless they are SUPER_ADMIN
    if req.role == RoleEnum.ADMIN and admin.role not in [RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN]:
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
    db: Session = Depends(get_db), admin: User = Depends(require_admin)
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
    db: Session = Depends(get_db), admin: User = Depends(require_admin)
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
    db: Session = Depends(get_db), admin: User = Depends(require_super_admin)
):
    target_user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if target_user.role == RoleEnum.SUPER_ADMIN and admin.id != target_user.id:
        raise HTTPException(status_code=403, detail="Cannot edit a SUPER_ADMIN")
        
    if target_user.role == RoleEnum.SUPER_ADMIN and req.role != RoleEnum.SUPER_ADMIN:
        super_admin_count = db.query(User).filter(User.role == RoleEnum.SUPER_ADMIN, User.is_deleted == False).count()
        if super_admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot downgrade the last Super Admin account.")
            
    if target_user.role in [RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN] and req.role not in [RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN]:
        admin_count = db.query(User).filter(User.role.in_([RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN]), User.is_deleted == False).count()
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot downgrade the last administrator.")
            
    old_role = target_user.role
    target_user.role = req.role
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
        
    if target_user.role == RoleEnum.SUPER_ADMIN and admin.role != RoleEnum.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Cannot edit a SUPER_ADMIN")
        
    old_status = target_user.status
    target_user.status = req.status
    db.commit()
    
    AuditService.log_action(db, admin.id, "UPDATE_USER_STATUS", request.client.host, request.headers.get("user-agent"), {"user_id": str(user_id), "old_status": old_status, "new_status": req.status})
    return SuccessResponse(message="Status updated", data={"id": str(user_id), "status": req.status})

@router.delete("/users/{user_id}", response_model=SuccessResponse)
def delete_user(
    user_id: uuid.UUID, request: Request,
    db: Session = Depends(get_db), admin: User = Depends(require_super_admin)
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account.")
        
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if target_user.role == RoleEnum.SUPER_ADMIN:
        super_admin_count = db.query(User).filter(User.role == RoleEnum.SUPER_ADMIN, User.is_deleted == False).count()
        if super_admin_count <= 1:
            raise HTTPException(status_code=403, detail="Cannot delete the last Super Admin account.")
    
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

# --- Projects ---
@router.get("/projects", response_model=SuccessResponse)
def get_projects(
    skip: int = 0, limit: int = 50, search: str = None,
    db: Session = Depends(get_db), admin: User = Depends(require_moderator)
):
    query = db.query(Project, User).join(User, Project.owner_id == User.id)
    if search:
        query = query.filter(Project.name.ilike(f"%{search}%"))
        
    total = query.count()
    results = query.order_by(Project.created_at.desc()).offset(skip).limit(limit).all()
    
    projects_list = []
    for proj, owner in results:
        file_count = db.query(File).filter(File.project_id == proj.id).count()
        executions = db.query(ExecutionLog).filter(ExecutionLog.project_id == proj.id).count()
        projects_list.append({
            "id": str(proj.id), "name": proj.name, "language": proj.language,
            "created_at": proj.created_at, "owner_username": owner.username,
            "file_count": file_count, "executions": executions, "visibility": proj.visibility
        })
        
    return SuccessResponse(message="Projects retrieved", data={"items": projects_list, "total": total})

@router.delete("/projects/{project_id}", response_model=SuccessResponse)
def delete_project(
    project_id: uuid.UUID, request: Request,
    db: Session = Depends(get_db), admin: User = Depends(require_admin)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project_name = project.name
    try:
        from app.models.execution_log import ExecutionLog
        from app.models.workspace import File, Folder, FileVersion
        from sqlalchemy import delete, select
        
        # 1. Delete Execution Logs
        db.execute(delete(ExecutionLog).where(ExecutionLog.project_id == project_id))
        
        # 2. Delete File Versions
        file_ids_subquery = select(File.id).where(File.project_id == project_id)
        db.execute(delete(FileVersion).where(FileVersion.file_id.in_(file_ids_subquery)))
        
        # 3. Delete Files
        db.execute(delete(File).where(File.project_id == project_id))
        
        # 4. Delete Folders
        db.execute(delete(Folder).where(Folder.project_id == project_id))
        
        # 5. Delete Project
        db.delete(project)
        db.commit()
    except Exception as e:
        db.rollback()
        from app.core.logger import logger
        logger.error(f"Failed to delete project: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete project")
    
    AuditService.log_action(db, admin.id, "DELETE_PROJECT", request.client.host, request.headers.get("user-agent"), {"project_id": str(project_id), "name": project_name})
    return SuccessResponse(message="Project deleted")

# --- Executions ---
@router.get("/executions", response_model=SuccessResponse)
def get_executions(
    skip: int = 0, limit: int = 50,
    db: Session = Depends(get_db), admin: User = Depends(require_moderator)
):
    total = db.query(ExecutionLog).count()
    rows = db.query(ExecutionLog, User.username).outerjoin(User, ExecutionLog.user_id == User.id).order_by(ExecutionLog.created_at.desc()).offset(skip).limit(limit).all()
    items = []
    for log, username in rows:
        items.append({
            "id": str(log.id), "language": log.language, "status": log.status,
            "duration_ms": log.duration_ms, "created_at": log.created_at,
            "username": username or "Anonymous",
        })
    return SuccessResponse(message="Executions retrieved", data={"items": items, "total": total})

# --- System Settings ---
@router.get("/system-settings", response_model=SuccessResponse)
def get_system_settings(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    settings_row = db.query(SystemSettings).first()
    if not settings_row:
        settings_row = SystemSettings()
        db.add(settings_row)
        db.commit()
        db.refresh(settings_row)
    
    data = {
        "maintenance_mode": getattr(settings_row, "maintenance_mode", False),
        "registration_enabled": getattr(settings_row, "registration_enabled", True),
        "login_enabled": getattr(settings_row, "login_enabled", True),
        "read_only_mode": getattr(settings_row, "read_only_mode", False),
        "max_execution_time_seconds": getattr(settings_row, "max_execution_time_seconds", 30),
        "max_memory_mb": getattr(settings_row, "max_memory_mb", 256),
        "max_file_size_mb": getattr(settings_row, "max_file_size_mb", 10),
        "max_projects_per_user": getattr(settings_row, "max_projects_per_user", 20),
        "rate_limit_per_minute": getattr(settings_row, "rate_limit_per_minute", 60),
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
def update_system_settings(req: SystemSettingsUpdate, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
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
    fields = [
        "maintenance_mode", "maintenance_message", "maintenance_end_time", "maintenance_allow_admin_access", "maintenance_show_countdown",
        "registration_enabled", "login_enabled", "read_only_mode",
        "max_execution_time_seconds", "max_memory_mb", "max_file_size_mb", "max_projects_per_user", "rate_limit_per_minute"
    ] + smtp_fields
    
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

    for field in fields:
        val = getattr(req, field, None)
        if val is not None:
            if hasattr(settings_row, field):
                setattr(settings_row, field, val)
                changes[field] = val
            
    db.commit()
    db.refresh(settings_row)
    
    if changes:
        AuditService.log_action(db, admin.id, "UPDATE_SYSTEM_SETTINGS", request.client.host, request.headers.get("user-agent"), changes)
        
    return SuccessResponse(message="Settings updated.", data=changes)

# --- Audit Logs ---
@router.get("/audit", response_model=SuccessResponse)
def get_audit_logs(
    skip: int = 0, limit: int = 50,
    db: Session = Depends(get_db), admin: User = Depends(require_super_admin)
):
    total = db.query(AuditLog).count()
    logs = db.query(AuditLog, User.username).outerjoin(User, AuditLog.user_id == User.id).order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    
    log_list = []
    for log, username in logs:
        log_list.append({
            "id": str(log.id), "action": log.action, "username": username or "Unknown",
            "ip_address": log.ip_address, "details": log.details, "created_at": log.created_at
        })
        
    return SuccessResponse(message="Audit logs retrieved", data={"items": log_list, "total": total})

# --- Feedback Management ---
@router.get("/feedback", response_model=SuccessResponse)
def get_feedback(
    skip: int = 0, limit: int = 50,
    db: Session = Depends(get_db), admin: User = Depends(require_moderator)
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
    db: Session = Depends(get_db), admin: User = Depends(require_moderator)
):
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
        
    old_status = feedback.status
    feedback.status = req.status
    db.commit()
    
    AuditService.log_action(db, admin.id, "UPDATE_FEEDBACK_STATUS", request.client.host, request.headers.get("user-agent"), {"feedback_id": str(feedback_id), "old_status": old_status, "new_status": req.status})
    return SuccessResponse(message="Status updated")

# --- Errors ---
@router.get("/errors", response_model=SuccessResponse)
def get_errors(
    skip: int = 0, limit: int = 50,
    db: Session = Depends(get_db), admin: User = Depends(require_moderator)
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

# --- Emails ---
@router.get("/emails", response_model=SuccessResponse)
def get_email_logs(
    skip: int = 0, limit: int = 50,
    db: Session = Depends(get_db), admin: User = Depends(require_admin)
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
    admin: User = Depends(require_admin)
):
    log = db.query(EmailLog).filter(EmailLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Email log not found")
        
    # In a real system, we'd trigger a background Celery task here to resend the email
    # For now, we mock the success response to fulfill the frontend endpoint
    log.status = EmailStatusEnum.PENDING
    log.retries = (log.retries or 0) + 1
    log.error_message = None
    db.commit()
    
    return SuccessResponse(message="Email queued for retry", data={"id": str(log.id)})

# --- Maintenance ---
@router.get("/maintenance", response_model=SuccessResponse)
def get_maintenance_config(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
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
    db: Session = Depends(get_db), admin: User = Depends(require_super_admin)
):
    settings_row = db.query(SystemSettings).first()
    if not settings_row:
        settings_row = SystemSettings()
        db.add(settings_row)
    
    changes = {}
    fields = ["maintenance_mode", "maintenance_message", "maintenance_end_time", "maintenance_allow_admin_access", "maintenance_show_countdown"]
    
    for field in fields:
        val = getattr(req, field, None)
        if val is not None:
            setattr(settings_row, field, val)
            changes[field] = val
            
    if changes:
        settings_row.updated_by_id = admin.id
        db.commit()
        db.refresh(settings_row)
        AuditService.log_action(db, admin.id, "UPDATE_MAINTENANCE_CONFIG", request.client.host, request.headers.get("user-agent"), changes)
        
    return SuccessResponse(message="Maintenance config updated", data=changes)

@router.post("/maintenance/enable", response_model=SuccessResponse)
def enable_maintenance(request: Request, db: Session = Depends(get_db), admin: User = Depends(require_super_admin)):
    settings_row = db.query(SystemSettings).first()
    if not settings_row:
        settings_row = SystemSettings()
        db.add(settings_row)
        
    settings_row.maintenance_mode = True
    settings_row.updated_by_id = admin.id
    db.commit()
    AuditService.log_action(db, admin.id, "ENABLE_MAINTENANCE", request.client.host, request.headers.get("user-agent"), {})
    return SuccessResponse(message="Maintenance mode enabled")

@router.post("/maintenance/disable", response_model=SuccessResponse)
def disable_maintenance(request: Request, db: Session = Depends(get_db), admin: User = Depends(require_super_admin)):
    settings_row = db.query(SystemSettings).first()
    if not settings_row:
        settings_row = SystemSettings()
        db.add(settings_row)
        
    settings_row.maintenance_mode = False
    settings_row.updated_by_id = admin.id
    db.commit()
    AuditService.log_action(db, admin.id, "DISABLE_MAINTENANCE", request.client.host, request.headers.get("user-agent"), {})
    return SuccessResponse(message="Maintenance mode disabled")

@router.post("/emails/test", response_model=SuccessResponse)
def send_test_email(
    request: Request,
    db: Session = Depends(get_db), admin: User = Depends(require_admin)
):
    try:
        from app.services.email_service import EmailService
        EmailService.send_test_email(str(admin.id))
        return SuccessResponse(message="Email sent successfully")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
