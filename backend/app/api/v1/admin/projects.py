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

# --- Projects ---
class ProjectActionRequest(BaseModel):
    action: str # archive, restore, clone
    reason: str | None = None

class BulkProjectActionRequest(BaseModel):
    project_ids: list[uuid.UUID]
    action: str
    reason: str | None = None

@router.get("/projects", response_model=SuccessResponse)
def get_projects(
    skip: int = 0, limit: int = 50, search: str = None,
    language: str = None, visibility: str = None, status: str = None,
    db: Session = Depends(get_db), admin: User = Depends(require_permission('users.read.basic'))
):
    query = db.query(Project, User).join(User, Project.owner_id == User.id)
    if search:
        query = query.filter(Project.name.ilike(f"%{search}%"))
    if language:
        query = query.filter(Project.language == language)
    if visibility:
        query = query.filter(Project.visibility == visibility)
    if status == "archived":
        query = query.filter(Project.deleted_at.isnot(None))
    elif status == "active":
        query = query.filter(Project.deleted_at.is_(None))
        
    total = query.count()
    results = query.order_by(Project.created_at.desc()).offset(skip).limit(limit).all()
    
    project_ids = [proj.id for proj, _ in results]
    file_counts = dict(db.query(File.project_id, func.count(File.id)).filter(File.project_id.in_(project_ids)).group_by(File.project_id).all()) if project_ids else {}
    exec_counts = dict(db.query(ExecutionLog.project_id, func.count(ExecutionLog.id)).filter(ExecutionLog.project_id.in_(project_ids)).group_by(ExecutionLog.project_id).all()) if project_ids else {}
    
    projects_list = []
    for proj, owner in results:
        file_count = file_counts.get(proj.id, 0)
        executions = exec_counts.get(proj.id, 0)
        projects_list.append({
            "id": str(proj.id), "name": proj.name, "language": proj.language,
            "created_at": proj.created_at, "owner_username": owner.username,
            "file_count": file_count, "executions": executions, "visibility": proj.visibility,
            "is_archived": proj.deleted_at is not None
        })
        
    return SuccessResponse(message="Projects retrieved", data={"items": projects_list, "total": total})

@router.get("/projects/{project_id}/details", response_model=SuccessResponse)
def get_project_details(
    project_id: uuid.UUID,
    db: Session = Depends(get_db), admin: User = Depends(require_permission('users.read.basic'))
):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
        
    owner = db.query(User).filter(User.id == proj.owner_id).first()
    files = db.query(File).filter(File.project_id == proj.id).all()
    storage_used = sum((f.size or 0) for f in files)
    
    execs = db.query(ExecutionLog).filter(ExecutionLog.project_id == proj.id).order_by(ExecutionLog.created_at.desc()).limit(10).all()
    exec_data = [{
        "status": str(e.status) if hasattr(e, 'status') else None, 
        "duration_ms": e.execution_time_ms, 
        "created_at": e.created_at, 
        "exit_code": e.exit_code
    } for e in execs]
    
    file_data = [{"name": f.name, "size": f.size, "language": f.language} for f in files]
    
    return SuccessResponse(message="Project details retrieved", data={
        "id": str(proj.id), "name": proj.name, "language": proj.language,
        "created_at": proj.created_at, "owner_username": owner.username if owner else "Unknown",
        "description": proj.description, "visibility": proj.visibility,
        "is_archived": proj.deleted_at is not None, "storage_used_bytes": storage_used,
        "files": file_data, "executions": exec_data, "slug": proj.slug
    })

@router.post("/projects/{project_id}/actions", response_model=SuccessResponse)
def perform_project_action(
    project_id: uuid.UUID, req: ProjectActionRequest, request: Request,
    db: Session = Depends(get_db), admin: User = Depends(require_permission('projects.delete.any'))
):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
        
    action_log = req.action.upper()
    
    if req.action == "archive":
        proj.deleted_at = datetime.now(timezone.utc)
    elif req.action == "restore":
        proj.deleted_at = None
    elif req.action == "clone":
        from app.models.workspace import Folder
        import string, random
        slug_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
        new_proj = Project(
            owner_id=proj.owner_id,
            name=f"{proj.name} (Admin Copy)",
            description=proj.description,
            language=proj.language,
            visibility=proj.visibility,
            slug=f"{proj.slug}-admin-{slug_suffix}"
        )
        db.add(new_proj)
        db.flush()
        
        folders = db.query(Folder).filter(Folder.project_id == proj.id).all()
        files = db.query(File).filter(File.project_id == proj.id).all()
        folder_map = {}
        for folder in folders:
            new_folder = Folder(project_id=new_proj.id, name=folder.name, parent_id=None)
            db.add(new_folder)
            db.flush()
            folder_map[folder.id] = new_folder.id
            
        for folder in folders:
            if folder.parent_id:
                new_f = db.query(Folder).filter(Folder.id == folder_map[folder.id]).first()
                new_f.parent_id = folder_map[folder.parent_id]
                
        for f in files:
            new_file = File(
                project_id=new_proj.id, name=f.name, content=f.content, 
                language=f.language, size=f.size, is_binary=f.is_binary,
                parent_id=folder_map.get(f.parent_id) if f.parent_id else None
            )
            db.add(new_file)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {req.action}")
        
    db.commit()
    AuditService.log_action(db, admin.id, f"PROJECT_ACTION_{action_log}", request.client.host, request.headers.get("user-agent"), {"project_id": str(project_id), "reason": req.reason})
    
    return SuccessResponse(message=f"Action '{req.action}' performed successfully")

@router.post("/projects/bulk-actions", response_model=SuccessResponse)
def perform_bulk_project_action(
    req: BulkProjectActionRequest, request: Request,
    db: Session = Depends(get_db), admin: User = Depends(require_permission('projects.delete.any'))
):
    projects = db.query(Project).filter(Project.id.in_(req.project_ids)).all()
    if not projects:
        raise HTTPException(status_code=404, detail="No projects found")
        
    action_log = req.action.upper()
    modified_count = 0
    
    for p in projects:
        if req.action == "archive":
            p.deleted_at = datetime.now(timezone.utc)
            modified_count += 1
        elif req.action == "restore":
            p.deleted_at = None
            modified_count += 1
        elif req.action == "delete":
            from app.models.workspace import File, Folder, FileVersion
            from sqlalchemy import delete
            db.execute(delete(ExecutionLog).where(ExecutionLog.project_id == p.id))
            file_ids = [f.id for f in db.query(File.id).filter(File.project_id == p.id).all()]
            if file_ids:
                db.execute(delete(FileVersion).where(FileVersion.file_id.in_(file_ids)))
            db.execute(delete(File).where(File.project_id == p.id))
            db.execute(delete(Folder).where(Folder.project_id == p.id))
            db.delete(p)
            modified_count += 1
            
    db.commit()
    AuditService.log_action(db, admin.id, f"BULK_PROJECT_ACTION_{action_log}", request.client.host, request.headers.get("user-agent"), {"target_count": modified_count, "action": req.action})
    
    return SuccessResponse(message=f"Bulk action '{req.action}' performed on {modified_count} projects")

@router.get("/projects/{project_id}/download")
def download_project_zip(
    project_id: uuid.UUID, request: Request,
    db: Session = Depends(get_db), admin: User = Depends(require_permission('projects.delete.any'))
):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
        
    from app.models.workspace import File, Folder
    files = db.query(File).filter(File.project_id == proj.id).all()
    folders = db.query(Folder).filter(Folder.project_id == proj.id).all()
    
    def get_path(item, is_folder=False):
        parts = [item.name]
        parent_id = item.parent_id
        while parent_id:
            parent = next((f for f in folders if f.id == parent_id), None)
            if parent:
                parts.insert(0, parent.name)
                parent_id = parent.parent_id
            else:
                break
        return "/".join(parts) + ("/" if is_folder else "")
        
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in files:
            file_path = get_path(f)
            content = f.content.encode('utf-8') if isinstance(f.content, str) else (f.content or b"")
            zf.writestr(file_path, content)
            
    zip_buffer.seek(0)
    AuditService.log_action(db, admin.id, "PROJECT_DOWNLOAD_ZIP", request.client.host, request.headers.get("user-agent"), {"project_id": str(proj.id)})
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{proj.slug}.zip"'}
    )


@router.delete("/projects/{project_id}", response_model=SuccessResponse)
def delete_project(
    project_id: uuid.UUID, request: Request,
    db: Session = Depends(get_db), admin: User = Depends(require_permission('projects.delete.any'))
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

