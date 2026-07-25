from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
from app.models.user import RoleEnum, StatusEnum
from app.models.feedback import FeedbackStatus
class UserRoleUpdate(BaseModel):
    role: RoleEnum

class SendEmailRequest(BaseModel):
    subject: str
    message: str

class UserStatusUpdate(BaseModel):
    status: StatusEnum

class SystemSettingsUpdate(BaseModel):
    app_name: str | None = None
    default_timezone: str | None = None
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
    
    queue_limits: int | None = None
    worker_limits: int | None = None
    retention_days: int | None = None
    feature_flags: dict | None = None
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
    
    # OAuth
    oauth_google_enabled: bool | None = None
    oauth_google_client_id: str | None = None
    oauth_google_client_secret: str | None = None
    oauth_github_enabled: bool | None = None
    oauth_github_client_id: str | None = None
    oauth_github_client_secret: str | None = None

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

