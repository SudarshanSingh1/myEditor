from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, List


# Folders
class FolderBase(BaseModel):
    name: str = Field(..., max_length=255)
    parent_id: Optional[UUID] = None


class FolderCreate(FolderBase):
    project_id: UUID


class FolderUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    parent_id: Optional[UUID] = None


class FolderResponse(FolderBase):
    id: UUID
    project_id: UUID
    path: str
    depth: int
    sort_order: int
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# Files
class FileBase(BaseModel):
    name: str = Field(..., max_length=255)
    folder_id: Optional[UUID] = None


class FileCreate(FileBase):
    project_id: UUID
    content: Optional[str] = None
    language: Optional[str] = None
    extension: Optional[str] = None


class FileUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    folder_id: Optional[UUID] = None
    content: Optional[str] = None


class FileResponse(FileBase):
    id: UUID
    project_id: UUID
    extension: Optional[str] = None
    language: Optional[str] = None
    size: int
    encoding: str
    version: int
    is_read_only: bool
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class FileWithContentResponse(FileResponse):
    content: Optional[str] = None


class FileVersionResponse(BaseModel):
    id: UUID
    file_id: UUID
    version_number: int
    size: int
    hash: Optional[str] = None
    created_by: Optional[UUID] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FileVersionWithContentResponse(FileVersionResponse):
    content: Optional[str] = None


class FileSaveRequest(BaseModel):
    id: UUID
    content: str
    expected_version: int


class FileSaveBatchRequest(BaseModel):
    files: List[FileSaveRequest]


# Tree structure for the frontend
class TreeFile(BaseModel):
    id: UUID
    name: str
    extension: Optional[str] = None
    language: Optional[str] = None
    size: int
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TreeFolder(BaseModel):
    id: UUID
    name: str
    path: str
    updated_at: datetime
    files: List[TreeFile] = []
    children: List["TreeFolder"] = []

    model_config = ConfigDict(from_attributes=True)


TreeFolder.model_rebuild()


class WorkspaceTreeResponse(BaseModel):
    project_id: UUID
    name: str
    folders: List[TreeFolder] = []
    files: List[TreeFile] = []


class GuestFileItem(BaseModel):
    name: str = Field(..., max_length=255)
    content: str
    language: Optional[str] = None
    extension: Optional[str] = None


class GuestMigrationRequest(BaseModel):
    project_name: str = Field(..., max_length=100)
    files: List[GuestFileItem]
