from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime
from uuid import UUID
from app.models.project import ProjectVisibilityEnum

class ProjectBase(BaseModel):
    name: str = Field(..., max_length=100, min_length=1, description="The name of the project. Cannot be empty.")
    description: Optional[str] = Field(None, max_length=500)
    language: Optional[str] = Field(None, max_length=50)
    visibility: ProjectVisibilityEnum = Field(default=ProjectVisibilityEnum.PRIVATE)
    color: Optional[str] = Field(None, max_length=50)
    icon: Optional[str] = Field(None, max_length=50)

    # Automatically strip whitespace from name
    @classmethod
    def validate_name(cls, value: str) -> str:
        return value.strip()

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100, min_length=1)
    description: Optional[str] = Field(None, max_length=500)
    language: Optional[str] = Field(None, max_length=50)
    visibility: Optional[ProjectVisibilityEnum] = None
    color: Optional[str] = Field(None, max_length=50)
    icon: Optional[str] = Field(None, max_length=50)
    favorite: Optional[bool] = None

class ProjectResponse(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    owner_id: UUID
    favorite: bool
    slug: str
    
    created_at: datetime
    updated_at: datetime
    last_opened_at: datetime
    deleted_at: Optional[datetime] = None

class ProjectListResponse(BaseModel):
    items: list[ProjectResponse]
    total: int
    page: int
    size: int
