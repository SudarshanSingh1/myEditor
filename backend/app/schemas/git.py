from pydantic import BaseModel
from typing import List, Optional


class CreateRepoRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    private: bool = True


class CloneRepoRequest(BaseModel):
    project_id: str
    repo_url: str
    branch: Optional[str] = None


class CommitRequest(BaseModel):
    project_id: str
    message: str
    files: Optional[List[str]] = None
    all_files: bool = False


class SyncRequest(BaseModel):
    project_id: str
    branch: Optional[str] = None
    remote_name: str = "origin"


class BranchRequest(BaseModel):
    project_id: str
    branch_name: str
    checkout: bool = True
