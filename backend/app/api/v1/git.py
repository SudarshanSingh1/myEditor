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
from app.api.v1.github import get_github_token, _get_github_oauth

router = APIRouter(prefix="/git", tags=["Git"])


def _translate_git_error(err: Exception) -> str:
    """Convert raw git/httpx errors to user-friendly messages."""
    msg = str(err)
    if "Authentication failed" in msg or "could not read Username" in msg:
        return "GitHub authentication failed. Your GitHub token may have expired — please reconnect GitHub."
    if "403" in msg or "remote: Permission" in msg:
        return "GitHub push rejected. Make sure the connected GitHub account has write access to this repository."
    if "404" in msg or "not found" in msg.lower():
        return "Repository not found. The repository may have been deleted or you may not have access."
    if "Repository not found" in msg:
        return "Repository not found or not accessible with the connected GitHub account."
    if "does not exist" in msg:
        return "Branch does not exist in the remote repository."
    return f"Git operation failed: {msg}"


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
        service.clone_repository(
            project=project,
            repo_url=request.repo_url,
            access_token=token,
            branch=request.branch,
        )

        # Persist the repo link
        project.github_repo_url = request.repo_url
        if request.branch:
            project.github_default_branch = request.branch
        db.commit()

        return SuccessResponse(message="Repository cloned successfully", data={})
    except Exception as e:
        raise HTTPException(status_code=400, detail=_translate_git_error(e))


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
            status_code=400,
            detail="Project is not linked to a GitHub repository. Please link a repository first.",
        )

    oauth_acc = _get_github_oauth(current_user)
    token = oauth_acc.access_token

    # Use the GitHub username for git config so commits are attributed correctly.
    # If we have a stored username, use it; otherwise fall back to the login from
    # the GitHub API call that happened when linking.
    git_username = oauth_acc.github_username or (
        project.owner.first_name if project.owner else "Editor"
    )
    # Use GitHub's noreply email format to avoid exposing real addresses
    github_user_id = oauth_acc.provider_account_id
    git_email = (
        f"{github_user_id}+{git_username}@users.noreply.github.com"
        if github_user_id and git_username
        else (project.owner.email if project.owner else "editor@noreply.github.com")
    )

    # Use the stored default branch, falling back to "main"
    branch = project.github_default_branch or "main"

    service = GitService(db)

    try:
        res = service.push_to_repository(
            project=project,
            repo_url=project.github_repo_url,
            access_token=token,
            commit_message=request.message,
            branch=branch,
            git_username=git_username,
            git_email=git_email,
        )
        return SuccessResponse(message="Pushed successfully", data=res)
    except Exception as e:
        raise HTTPException(status_code=400, detail=_translate_git_error(e))
