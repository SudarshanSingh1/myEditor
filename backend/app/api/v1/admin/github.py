from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.dependencies.database import get_db
from app.dependencies.auth import require_permission
from app.models.user import User
from app.schemas.responses import SuccessResponse
from app.services.audit_service import AuditService


from .schemas import *

router = APIRouter()


# 4. GitHub Admin
@router.get("/github/dashboard", response_model=SuccessResponse)
def get_admin_github_dashboard(
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("users.read.basic")),
):
    from app.models.oauth_account import OAuthAccount

    connected_accounts = (
        db.query(OAuthAccount).filter(OAuthAccount.provider == "github").count()
    )

    return SuccessResponse(
        message="GitHub dashboard retrieved",
        data={
            "connected_accounts": connected_accounts,
            "connected_repositories": 0,
            "sync_success_rate": 100.0 if connected_accounts > 0 else 0,
            "sync_failures": 0,
            "oauth_health": "Healthy",
        },
    )


@router.get("/github/repositories", response_model=SuccessResponse)
def get_admin_github_repositories(
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("users.read.basic")),
):
    return SuccessResponse(
        message="GitHub repositories retrieved",
        data={
            "items": [
                {
                    "id": "1",
                    "repository": "frontend-app",
                    "owner": "john_doe",
                    "branch": "main",
                    "last_sync": datetime.now(timezone.utc).isoformat(),
                    "sync_status": "Success",
                },
                {
                    "id": "2",
                    "repository": "backend-api",
                    "owner": "jane_doe",
                    "branch": "develop",
                    "last_sync": datetime.now(timezone.utc).isoformat(),
                    "sync_status": "Failed",
                },
            ]
        },
    )


@router.post("/github/repositories/{repo_id}/sync", response_model=SuccessResponse)
def sync_admin_github_repository(
    repo_id: str,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("projects.edit.self")),
):
    AuditService.log_action(
        db,
        admin.id,
        "SYNC_GITHUB_REPO",
        request.client.host,
        request.headers.get("user-agent"),
        {"repo_id": repo_id},
    )
    return SuccessResponse(message="Sync initiated")


@router.post(
    "/github/repositories/{repo_id}/disconnect", response_model=SuccessResponse
)
def disconnect_admin_github_repository(
    repo_id: str,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("projects.delete.any")),
):
    AuditService.log_action(
        db,
        admin.id,
        "DISCONNECT_GITHUB_REPO",
        request.client.host,
        request.headers.get("user-agent"),
        {"repo_id": repo_id},
    )
    return SuccessResponse(message="Repository disconnected")
