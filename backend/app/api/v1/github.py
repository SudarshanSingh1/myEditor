from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any, Optional
from uuid import UUID

from app.dependencies.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.oauth_account import OAuthAccount
from app.models.project import Project
from app.schemas.responses import SuccessResponse
from app.services.github_service import GitHubService
from pydantic import BaseModel

router = APIRouter(prefix="/github", tags=["GitHub"])


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _get_github_oauth(user: User) -> OAuthAccount:
    """Return the connected GitHub OAuthAccount for this user or raise 401."""
    oauth_acc = next(
        (acc for acc in user.oauth_accounts if acc.provider == "github"), None
    )
    if not oauth_acc or not oauth_acc.access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="GitHub account not connected. Please connect your GitHub account first.",
        )
    return oauth_acc


def get_github_token(user: User) -> str:
    """Return raw access token (used by git.py)."""
    return _get_github_oauth(user).access_token


def _get_project_owned_by(
    project_id: UUID, user: User, db: Session
) -> Project:
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == user.id,
        Project.deleted_at.is_(None),
    ).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied.",
        )
    return project


# ---------------------------------------------------------------------------
# GitHub connection status
# ---------------------------------------------------------------------------


@router.get("/status", response_model=SuccessResponse[Any])
async def github_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Returns whether GitHub is connected for the current editor user and,
    if so, the connected GitHub username and avatar.

    Does NOT assume the GitHub email matches the editor account email.
    """
    oauth_acc = next(
        (acc for acc in current_user.oauth_accounts if acc.provider == "github"), None
    )

    if not oauth_acc or not oauth_acc.access_token:
        return SuccessResponse(
            message="GitHub not connected",
            data={"connected": False, "github_username": None, "avatar_url": None},
        )

    # Verify token is still valid by calling GitHub API
    service = GitHubService(oauth_acc.access_token)
    try:
        gh_user = await service.get_user()
    except Exception:
        # Token is invalid/expired — mark as disconnected without deleting
        return SuccessResponse(
            message="GitHub token expired",
            data={
                "connected": False,
                "token_expired": True,
                "github_username": oauth_acc.github_username,
                "avatar_url": oauth_acc.avatar_url,
            },
        )

    # Refresh display fields in case username/avatar changed
    fresh_username = gh_user.get("login") or oauth_acc.github_username
    fresh_avatar = gh_user.get("avatar_url") or oauth_acc.avatar_url
    if fresh_username != oauth_acc.github_username or fresh_avatar != oauth_acc.avatar_url:
        oauth_acc.github_username = fresh_username
        oauth_acc.avatar_url = fresh_avatar
        db.commit()

    return SuccessResponse(
        message="GitHub connected",
        data={
            "connected": True,
            "github_username": fresh_username,
            "avatar_url": fresh_avatar,
            "github_user_id": gh_user.get("id"),
        },
    )


# ---------------------------------------------------------------------------
# Disconnect GitHub
# ---------------------------------------------------------------------------


@router.delete("/disconnect", response_model=SuccessResponse[Any])
def github_disconnect(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Disconnect the GitHub account from the current editor user.
    All project→repo links are preserved so the user can reconnect later.
    """
    oauth_acc = next(
        (acc for acc in current_user.oauth_accounts if acc.provider == "github"), None
    )
    if not oauth_acc:
        raise HTTPException(status_code=404, detail="No GitHub account connected.")

    db.delete(oauth_acc)
    db.commit()
    return SuccessResponse(message="GitHub account disconnected.", data={})


# ---------------------------------------------------------------------------
# Repository listing
# ---------------------------------------------------------------------------


@router.get("/repos", response_model=SuccessResponse[Any])
async def list_repositories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """List all repositories accessible by the connected GitHub account."""
    token = get_github_token(current_user)
    service = GitHubService(token)
    try:
        repos = await service.list_repositories()
        # Return only the fields the UI needs
        slim = [
            {
                "id": r["id"],
                "full_name": r["full_name"],
                "name": r["name"],
                "owner": r["owner"]["login"],
                "private": r["private"],
                "default_branch": r.get("default_branch", "main"),
                "html_url": r["html_url"],
                "clone_url": r["clone_url"],
            }
            for r in repos
        ]
        return SuccessResponse(message="Repositories fetched", data=slim)
    except HTTPException:
        raise
    except Exception as e:
        err_str = str(e)
        if "401" in err_str or "Unauthorized" in err_str:
            raise HTTPException(
                status_code=401,
                detail="GitHub authorization has expired. Please reconnect GitHub.",
            )
        raise HTTPException(status_code=400, detail=f"GitHub error: {err_str}")


# ---------------------------------------------------------------------------
# Create repository
# ---------------------------------------------------------------------------


@router.post("/repos", response_model=SuccessResponse[Any])
async def create_repository(
    request: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    name = request.get("name")
    description = request.get("description", "")
    private = request.get("private", True)

    if not name:
        raise HTTPException(status_code=400, detail="Repository name is required")

    token = get_github_token(current_user)
    service = GitHubService(token)
    try:
        repo = await service.create_repository(
            name=name, description=description, private=private
        )
        return SuccessResponse(message="Repository created", data=repo)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------------------------
# Project → GitHub repository linking
# ---------------------------------------------------------------------------


class LinkRepoRequest(BaseModel):
    repo_url: str                          # https://github.com/owner/repo
    default_branch: Optional[str] = "main"


@router.post("/projects/{project_id}/link", response_model=SuccessResponse[Any])
async def link_project_to_repo(
    project_id: UUID,
    req: LinkRepoRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Link an editor project to a GitHub repository.

    Validates that the connected GitHub account can actually access the
    repository before saving the association.  Does NOT import repo content —
    for that use POST /git/clone.
    """
    # 1. Verify GitHub is connected
    oauth_acc = _get_github_oauth(current_user)

    # 2. Verify project ownership
    project = _get_project_owned_by(project_id, current_user, db)

    # 3. Verify repository access
    service = GitHubService(oauth_acc.access_token)
    # Extract owner/repo from URL
    repo_url = req.repo_url.rstrip("/")
    if repo_url.endswith(".git"):
        repo_url = repo_url[:-4]
    parts = repo_url.split("github.com/")
    if len(parts) != 2:
        raise HTTPException(
            status_code=400,
            detail="Invalid GitHub repository URL. Expected https://github.com/owner/repo",
        )
    owner_repo = parts[1]  # "owner/repo"
    try:
        repo_info = await service.get_repo(owner_repo)
    except Exception as e:
        err = str(e)
        if "404" in err or "Not Found" in err:
            raise HTTPException(
                status_code=404,
                detail=f"Repository '{owner_repo}' not found or not accessible with the connected GitHub account.",
            )
        if "401" in err or "403" in err:
            raise HTTPException(
                status_code=403,
                detail="GitHub authorization does not allow access to this repository.",
            )
        raise HTTPException(status_code=400, detail=f"GitHub error: {err}")

    # 4. Save the link
    branch = req.default_branch or repo_info.get("default_branch", "main")
    clone_url = repo_info.get("clone_url", req.repo_url)
    if not clone_url.endswith(".git"):
        clone_url += ".git"

    project.github_repo_url = clone_url
    project.github_default_branch = branch
    db.commit()
    db.refresh(project)

    return SuccessResponse(
        message=f"Project linked to {owner_repo} ({branch})",
        data={
            "repo_url": clone_url,
            "default_branch": branch,
            "full_name": repo_info.get("full_name", owner_repo),
        },
    )


@router.delete("/projects/{project_id}/link", response_model=SuccessResponse[Any])
def unlink_project_from_repo(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Remove the GitHub repository link from a project."""
    project = _get_project_owned_by(project_id, current_user, db)
    project.github_repo_url = None
    project.github_default_branch = None
    db.commit()
    return SuccessResponse(message="Project unlinked from GitHub repository.", data={})
