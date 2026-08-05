from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Any

from app.dependencies.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.responses import SuccessResponse
from app.schemas.git import CloneRepoRequest, CommitRequest
from app.services.git_service import GitService
from app.repositories.project_repository import ProjectRepository
from app.api.v1.github import get_github_token

router = APIRouter(prefix="/git", tags=["Git"])


@router.post("/clone", response_model=SuccessResponse[Any])
def clone_repository(
    request: CloneRepoRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    project = ProjectRepository(db).get_by_id(request.project_id)
    if not project or project.owner_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Project not found or access denied"
        )

    token = get_github_token(current_user)
    service = GitService(db)

    try:
        # Clone repo to DB
        service.clone_repository(
            project=project,
            repo_url=request.repo_url,
            access_token=token,
            branch=request.branch,
        )

        # Save repo URL to project
        project.github_repo_url = request.repo_url
        db.commit()

        return SuccessResponse(message="Repository cloned successfully", data={})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/push", response_model=SuccessResponse[Any])
def push_repository(
    request: CommitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    project = ProjectRepository(db).get_by_id(request.project_id)
    if not project or project.owner_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Project not found or access denied"
        )

    if not project.github_repo_url:
        raise HTTPException(
            status_code=400, detail="Project is not linked to a GitHub repository"
        )

    token = get_github_token(current_user)
    service = GitService(db)

    try:
        res = service.push_to_repository(
            project=project,
            repo_url=project.github_repo_url,
            access_token=token,
            commit_message=request.message,
            branch="main",  # Can be made dynamic
        )
        return SuccessResponse(message="Pushed successfully", data=res)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
