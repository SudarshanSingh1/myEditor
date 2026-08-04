from fastapi import APIRouter, Depends, status, Query, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
import re
from typing import List

from app.dependencies.database import get_db
from app.models.user import User
from app.dependencies.auth import get_current_user_dep as get_current_user
from app.schemas.responses import SuccessResponse
from app.schemas.workspace import (
    FolderCreate, FolderUpdate, FolderResponse,
    FileCreate, FileUpdate, FileResponse, FileWithContentResponse,
    FileSaveRequest, FileSaveBatchRequest,
    WorkspaceTreeResponse
)
from app.services.workspace_service import WorkspaceService
from app.core.rate_limit import limiter

router = APIRouter()

# -------------------------------------------------------------------
# TREE API
# -------------------------------------------------------------------
@router.get("/projects/{project_id}/tree", response_model=SuccessResponse[WorkspaceTreeResponse])
def get_workspace_tree(project_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tree = WorkspaceService.get_workspace_tree(db, project_id, current_user)
    return SuccessResponse(message="Workspace tree retrieved.", data=tree)

# -------------------------------------------------------------------
# FOLDERS
# -------------------------------------------------------------------
@router.post("/folders", response_model=SuccessResponse[FolderResponse], status_code=status.HTTP_201_CREATED)
def create_folder(req: FolderCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    folder = WorkspaceService.create_folder(db, req, current_user)
    return SuccessResponse(message="Folder created.", data=folder)

@router.put("/folders/{folder_id}", response_model=SuccessResponse[FolderResponse])
def update_folder(folder_id: UUID, req: FolderUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    folder = WorkspaceService.update_folder(db, folder_id, req, current_user)
    return SuccessResponse(message="Folder updated.", data=folder)

@router.delete("/folders/{folder_id}", response_model=SuccessResponse)
def delete_folder(folder_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    WorkspaceService.delete_folder(db, folder_id, current_user)
    return SuccessResponse(message="Folder deleted.")

# -------------------------------------------------------------------
# FILES
# -------------------------------------------------------------------
@router.post("/files", response_model=SuccessResponse[FileResponse], status_code=status.HTTP_201_CREATED)
def create_file(req: FileCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    file = WorkspaceService.create_file(db, req, current_user)
    return SuccessResponse(message="File created.", data=file)

@router.get("/files/{file_id}", response_model=SuccessResponse[FileWithContentResponse])
def get_file(file_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    file = WorkspaceService.get_file(db, file_id, current_user)
    return SuccessResponse(message="File retrieved.", data=file)

@router.put("/files/{file_id}", response_model=SuccessResponse[FileResponse])
def update_file(file_id: UUID, req: FileUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    file = WorkspaceService.update_file(db, file_id, req, current_user)
    return SuccessResponse(message="File updated.", data=file)

@router.delete("/files/{file_id}", response_model=SuccessResponse)
def delete_file(file_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    WorkspaceService.delete_file(db, file_id, current_user)
    return SuccessResponse(message="File deleted.")

@router.post("/files/{file_id}/duplicate", response_model=SuccessResponse[FileResponse])
def duplicate_file(file_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    file = WorkspaceService.duplicate_file(db, file_id, current_user)
    return SuccessResponse(message="File duplicated.", data=file)

@router.post("/files/save", response_model=SuccessResponse[FileResponse])
def save_file(req: FileSaveRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    file = WorkspaceService.save_file(db, req.id, req.expected_version, req.content, current_user)
    return SuccessResponse(message="File saved successfully.", data=file)

@router.post("/files/save-batch", response_model=SuccessResponse[list[FileResponse]])
def save_batch(req: FileSaveBatchRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    files = WorkspaceService.save_batch(db, req.files, current_user)
    return SuccessResponse(message="Files saved successfully.", data=files)

# -------------------------------------------------------------------
# VERSIONS
# -------------------------------------------------------------------
from app.schemas.workspace import FileVersionResponse, FileVersionWithContentResponse
from typing import List

@router.get("/files/{file_id}/versions", response_model=SuccessResponse[List[FileVersionResponse]])
def get_file_versions(file_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    versions = WorkspaceService.get_file_versions(db, file_id, current_user)
    return SuccessResponse(message="File versions retrieved.", data=versions)

@router.get("/files/{file_id}/versions/{version_number}", response_model=SuccessResponse[FileVersionWithContentResponse])
def get_file_version(file_id: UUID, version_number: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    version = WorkspaceService.get_file_version(db, file_id, version_number, current_user)
    return SuccessResponse(message="File version retrieved.", data=version)

@router.post("/files/{file_id}/restore/{version_number}", response_model=SuccessResponse[FileResponse])
def restore_file_version(file_id: UUID, version_number: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    file = WorkspaceService.restore_version(db, file_id, version_number, current_user)
    return SuccessResponse(message=f"File restored to version {version_number}.", data=file)

@router.delete("/files/{file_id}/versions/{version_number}", response_model=SuccessResponse)
def delete_file_version(file_id: UUID, version_number: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    WorkspaceService.delete_version(db, file_id, version_number, current_user)
    return SuccessResponse(message="File version deleted.")

# -------------------------------------------------------------------
# GUEST MIGRATION
# -------------------------------------------------------------------
from app.schemas.workspace import GuestMigrationRequest
from app.models.project import Project
from app.models.workspace import File as WorkspaceFile

@router.post("/migrate-guest", response_model=SuccessResponse)
def migrate_guest_workspace(req: GuestMigrationRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Create new project for the migrated files
    new_project = Project(
        name=req.project_name,
        owner_id=current_user.id,
        is_public=False
    )
    db.add(new_project)
    db.flush() # get new_project.id
    
    # Create the files
    for g_file in req.files:
        db_file = WorkspaceFile(
            project_id=new_project.id,
            name=g_file.name,
            content=g_file.content,
            size=len(g_file.content) if g_file.content else 0,
            language=g_file.language,
            extension=g_file.extension,
            version=1
        )
        db.add(db_file)
        
    # We could also mark the guest session as `is_converted = True` here if we pass the guest_id
        
    db.commit()
    
    return SuccessResponse(message="Guest workspace migrated successfully.", data={"project_id": str(new_project.id)})


# -------------------------------------------------------------------
# SEARCH
# -------------------------------------------------------------------

@router.get("/search")
@limiter.limit("20/minute")
def search_project_files(
    request,  # required by slowapi for rate limiting
    project_id: UUID = Query(..., description="Project to search within"),
    q: str = Query(..., min_length=1, max_length=200, description="Search query"),
    case_sensitive: bool = Query(False, description="Case-sensitive match"),
    use_regex: bool = Query(False, alias="regex", description="Treat q as a regular expression"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Search for text or a regex pattern across all files in a project.

    Returns up to 500 matches with file path, line number, line content,
    and character-level match offsets.

    Rate limited to 20 requests/minute per user.
    """
    from app.models.workspace import File, Folder

    # Build regex pattern from query
    flags = 0 if case_sensitive else re.IGNORECASE
    try:
        if use_regex:
            pattern = re.compile(q, flags)
        else:
            pattern = re.compile(re.escape(q), flags)
    except re.error as exc:
        raise HTTPException(status_code=422, detail=f"Invalid regex pattern: {exc}")

    # Fetch all non-deleted files for this project
    files = (
        db.query(File)
        .filter(File.project_id == project_id, File.is_deleted == False)  # noqa: E712
        .all()
    )

    if not files:
        return SuccessResponse(message="No files found in project.", data=[])

    # Verify access via the first file's project (cheap authorization check)
    WorkspaceService._verify_project_access(db, project_id, current_user)

    results = []
    MAX_RESULTS = 500

    for file in files:
        if not file.content:
            continue
        # Resolve folder path for display
        folder_path = ""
        if file.folder_id:
            folder = db.query(Folder).filter(Folder.id == file.folder_id).first()
            if folder:
                folder_path = folder.path.lstrip("/") + "/"

        full_path = folder_path + file.name

        for line_num, line in enumerate(file.content.splitlines(), start=1):
            for match in pattern.finditer(line):
                results.append({
                    "file_id": str(file.id),
                    "file_name": file.name,
                    "path": full_path,
                    "line_number": line_num,
                    "line_content": line,
                    "match_start": match.start(),
                    "match_end": match.end(),
                })
                if len(results) >= MAX_RESULTS:
                    return SuccessResponse(
                        message=f"Showing first {MAX_RESULTS} matches. Refine your query for more precise results.",
                        data=results,
                    )

    return SuccessResponse(
        message=f"Found {len(results)} match(es).",
        data=results,
    )
