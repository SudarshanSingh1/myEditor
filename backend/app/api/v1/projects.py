from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional

from app.dependencies.database import get_db
from app.dependencies.auth import get_current_user_dep as get_current_user
from app.models.user import User
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectListResponse,
)
from app.schemas.responses import SuccessResponse
from app.services.project_service import ProjectService

router = APIRouter()


@router.get(
    "",
    response_model=SuccessResponse[ProjectListResponse],
)
def get_projects(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    language: Optional[str] = None,
    favorite: Optional[bool] = None,
    sort_by: str = Query(
        "updated_at",
        pattern="^(updated_at|created_at|last_opened_at|name)$",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProjectService(db)

    result = service.get_projects(
        user_id=current_user.id,
        page=page,
        size=size,
        search=search,
        language=language,
        favorite=favorite,
        sort_by=sort_by,
        deleted=False,
    )

    return SuccessResponse(
        message="Projects retrieved successfully.",
        data=result,
    )


@router.get(
    "/trash",
    response_model=SuccessResponse[ProjectListResponse],
)
def get_trashed_projects(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    sort_by: str = Query(
        "updated_at",
        pattern="^(updated_at|created_at|name)$",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProjectService(db)

    result = service.get_projects(
        user_id=current_user.id,
        page=page,
        size=size,
        search=search,
        sort_by=sort_by,
        deleted=True,
    )

    return SuccessResponse(
        message="Trash retrieved successfully.",
        data=result,
    )


@router.post(
    "",
    response_model=SuccessResponse[ProjectResponse],
    status_code=status.HTTP_201_CREATED,
)
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProjectService(db)

    project = service.create_project(data, current_user.id)

    return SuccessResponse(
        message="Project created successfully.",
        data=project,
    )


@router.get(
    "/{project_id}",
    response_model=SuccessResponse[ProjectResponse],
)
def get_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProjectService(db)

    project = service.get_project(project_id, current_user.id)

    return SuccessResponse(
        message="Project retrieved successfully.",
        data=project,
    )


@router.put(
    "/{project_id}",
    response_model=SuccessResponse[ProjectResponse],
)
def update_project(
    project_id: UUID,
    data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProjectService(db)

    project = service.update_project(project_id, data, current_user.id)

    return SuccessResponse(
        message="Project updated successfully.",
        data=project,
    )


@router.delete(
    "/trash",
    response_model=SuccessResponse[dict],
)
def empty_trash(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProjectService(db)
    service.empty_trash(current_user.id)
    return SuccessResponse(
        message="Trash emptied successfully.",
        data={},
    )


@router.delete(
    "/{project_id}",
    response_model=SuccessResponse[ProjectResponse],
)
def soft_delete_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProjectService(db)

    project = service.soft_delete_project(project_id, current_user.id)

    return SuccessResponse(
        message="Project moved to trash successfully.",
        data=project,
    )

@router.delete(
    "/{project_id}/permanent",
    response_model=SuccessResponse[dict],
)
def hard_delete_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProjectService(db)

    service.hard_delete_project(project_id, current_user.id)

    return SuccessResponse(
        message="Project permanently deleted.",
        data={},
    )


@router.post(
    "/{project_id}/restore",
    response_model=SuccessResponse[ProjectResponse],
)
def restore_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProjectService(db)

    project = service.restore_project(project_id, current_user.id)

    return SuccessResponse(
        message="Project restored successfully.",
        data=project,
    )


@router.post(
    "/{project_id}/favorite",
    response_model=SuccessResponse[ProjectResponse],
)
def toggle_favorite(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProjectService(db)

    project = service.toggle_favorite(project_id, current_user.id)

    return SuccessResponse(
        message="Favorite updated successfully.",
        data=project,
    )


@router.post(
    "/{project_id}/duplicate",
    response_model=SuccessResponse[ProjectResponse],
    status_code=status.HTTP_201_CREATED,
)
def duplicate_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProjectService(db)

    project = service.duplicate_project(project_id, current_user.id)

    return SuccessResponse(
        message="Project duplicated successfully.",
        data=project,
    )