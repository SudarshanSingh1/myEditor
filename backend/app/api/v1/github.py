from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any

from app.dependencies.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.responses import SuccessResponse
from app.services.github_service import GitHubService

router = APIRouter(prefix="/github", tags=["GitHub"])


def get_github_token(user: User) -> str:
    oauth_acc = next(
        (acc for acc in user.oauth_accounts if acc.provider == "github"), None
    )
    if not oauth_acc or not getattr(oauth_acc, "access_token", None):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="GitHub account not connected or missing access token",
        )
    return oauth_acc.access_token


@router.get("/repos", response_model=SuccessResponse[Any])
async def list_repositories(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
) -> Any:
    token = get_github_token(current_user)
    service = GitHubService(token)
    try:
        repos = await service.list_repositories()
        return SuccessResponse(message="Repositories fetched", data=repos)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


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
