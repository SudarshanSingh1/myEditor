from sqlalchemy.orm import Session
from uuid import UUID
from fastapi import HTTPException
from typing import List, Any, Optional

from app.models.user import User
from app.models.workspace import Folder, File
from app.models.project import Project
from app.schemas.workspace import (
    FolderCreate, FolderUpdate, FileCreate, FileUpdate, WorkspaceTreeResponse, TreeFolder, TreeFile
)
from app.repositories.workspace_repository import WorkspaceRepository
from app.repositories.project_repository import ProjectRepository
import re

class WorkspaceService:
    RESERVED_NAMES = {".git", ".env", "node_modules", "dist", "build"}
    INVALID_CHARS_REGEX = re.compile(r'[<>:"/\\|?*]')
    ALLOWED_EXTENSIONS = {
        "py", "js", "ts", "jsx", "tsx", "html", "css", "scss", "less", "json", "md",
        "txt", "csv", "sql", "sh", "yaml", "yml", "xml", "c", "cpp", "h", "hpp",
        "java", "go", "rs", "rb", "php", "swift", "kt", "scala", "bat", "ps1"
    }

    @classmethod
    def _validate_name(cls, name: str, is_folder: bool = False):
        if not name or not name.strip():
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        
        name = name.strip()
        if cls.INVALID_CHARS_REGEX.search(name):
            raise HTTPException(status_code=400, detail="Name contains invalid characters")
            
        if is_folder and name in cls.RESERVED_NAMES:
            raise HTTPException(status_code=400, detail="Reserved folder name")

        if not is_folder:
            ext = cls._extract_extension(name)
            if not ext or ext.lower() not in cls.ALLOWED_EXTENSIONS:
                raise HTTPException(status_code=400, detail="Only coding files are allowed.")

        return name

    @classmethod
    def _verify_project_access(cls, db: Session, project_id: UUID, current_user: User) -> Project:
        repo = ProjectRepository(db)
        project = repo.get_by_id(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Simplified access control: Owner only for now (collaboration later)
        if project.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this project")
        return project

    # ---------------------------------------------------------
    # Folders
    # ---------------------------------------------------------
    @classmethod
    def create_folder(cls, db: Session, obj_in: FolderCreate, current_user: User) -> Folder:
        cls._verify_project_access(db, obj_in.project_id, current_user)
        name = cls._validate_name(obj_in.name, is_folder=True)
        obj_in.name = name

        if WorkspaceRepository.get_folder_by_name(db, obj_in.project_id, name, obj_in.parent_id):
            raise HTTPException(status_code=409, detail="Folder with this name already exists in the destination")

        path = f"/{name}"
        depth = 0
        if obj_in.parent_id:
            parent = WorkspaceRepository.get_folder(db, obj_in.parent_id)
            if not parent or parent.project_id != obj_in.project_id:
                raise HTTPException(status_code=400, detail="Invalid parent folder")
            path = f"{parent.path}/{name}"
            depth = parent.depth + 1

        return WorkspaceRepository.create_folder(db, obj_in, path=path, depth=depth)

    @classmethod
    def update_folder(cls, db: Session, folder_id: UUID, obj_in: FolderUpdate, current_user: User) -> Folder:
        folder = WorkspaceRepository.get_folder(db, folder_id)
        if not folder:
            raise HTTPException(status_code=404, detail="Folder not found")
            
        cls._verify_project_access(db, folder.project_id, current_user)

        new_path = None
        new_depth = None
        
        # Determine if we are renaming or moving or both
        new_name = folder.name
        if obj_in.name is not None:
            new_name = cls._validate_name(obj_in.name, is_folder=True)
            
        new_parent_id = folder.parent_id
        if obj_in.parent_id is not None:
            new_parent_id = obj_in.parent_id
            
            # Anti-cycle check
            if new_parent_id == folder.id:
                raise HTTPException(status_code=400, detail="Folder cannot be its own parent")

        # If name or parent changed, check for duplicates
        if new_name != folder.name or new_parent_id != folder.parent_id:
            if WorkspaceRepository.get_folder_by_name(db, folder.project_id, new_name, new_parent_id):
                raise HTTPException(status_code=409, detail="Folder with this name already exists in the destination")
                
            # Recalculate path and depth
            if new_parent_id:
                parent = WorkspaceRepository.get_folder(db, new_parent_id)
                if not parent or parent.project_id != folder.project_id:
                    raise HTTPException(status_code=400, detail="Invalid parent folder")
                
                # Cannot move into a descendant (cycle prevention)
                if parent.path.startswith(f"{folder.path}/"):
                    raise HTTPException(status_code=400, detail="Cannot move folder into its own descendant")
                    
                new_path = f"{parent.path}/{new_name}"
                new_depth = parent.depth + 1
            else:
                new_path = f"/{new_name}"
                new_depth = 0

            obj_in.name = new_name
            # Note: We aren't doing cascade path update on descendants here for simplicity,
            # but in a full production system, moving a folder requires updating paths
            # of all descendants. For the requested Tree structure, path is less critical 
            # if we reconstruct via parent_id anyway.

        return WorkspaceRepository.update_folder(db, folder, obj_in, new_path, new_depth)

    @classmethod
    def delete_folder(cls, db: Session, folder_id: UUID, current_user: User) -> None:
        folder = WorkspaceRepository.get_folder(db, folder_id)
        if not folder:
            raise HTTPException(status_code=404, detail="Folder not found")
            
        cls._verify_project_access(db, folder.project_id, current_user)
        WorkspaceRepository.soft_delete_folder_cascade(db, folder)

    # ---------------------------------------------------------
    # Files
    # ---------------------------------------------------------
    @staticmethod
    def _extract_extension(filename: str) -> Optional[str]:
        parts = filename.rsplit('.', 1)
        if len(parts) > 1 and parts[1]:
            return parts[1].lower()
        return None

    @classmethod
    def create_file(cls, db: Session, obj_in: FileCreate, current_user: User) -> File:
        cls._verify_project_access(db, obj_in.project_id, current_user)
        name = cls._validate_name(obj_in.name)
        obj_in.name = name
        
        if not obj_in.extension:
            obj_in.extension = cls._extract_extension(name)

        if obj_in.folder_id:
            parent = WorkspaceRepository.get_folder(db, obj_in.folder_id)
            if not parent or parent.project_id != obj_in.project_id:
                raise HTTPException(status_code=400, detail="Invalid folder")

        if WorkspaceRepository.get_file_by_name(db, obj_in.project_id, name, obj_in.folder_id):
            raise HTTPException(status_code=409, detail="File with this name already exists in the destination")

        return WorkspaceRepository.create_file(db, obj_in)

    @classmethod
    def update_file(cls, db: Session, file_id: UUID, obj_in: FileUpdate, current_user: User) -> File:
        file = WorkspaceRepository.get_file(db, file_id)
        if not file:
            raise HTTPException(status_code=404, detail="File not found")
            
        cls._verify_project_access(db, file.project_id, current_user)

        new_name = file.name
        new_folder_id = file.folder_id
        
        if obj_in.name is not None:
            new_name = cls._validate_name(obj_in.name)
            
        if obj_in.folder_id is not None:
            new_folder_id = obj_in.folder_id

        if new_name != file.name or new_folder_id != file.folder_id:
            if WorkspaceRepository.get_file_by_name(db, file.project_id, new_name, new_folder_id):
                raise HTTPException(status_code=409, detail="File with this name already exists in the destination")
            
            if new_folder_id:
                parent = WorkspaceRepository.get_folder(db, new_folder_id)
                if not parent or parent.project_id != file.project_id:
                    raise HTTPException(status_code=400, detail="Invalid folder")
        
        obj_in.name = new_name
        extension = cls._extract_extension(new_name) if new_name != file.name else None

        return WorkspaceRepository.update_file(db, file, obj_in, extension=extension)

    @classmethod
    def get_file(cls, db: Session, file_id: UUID, current_user: User) -> File:
        file = WorkspaceRepository.get_file(db, file_id)
        if not file:
            raise HTTPException(status_code=404, detail="File not found")
        cls._verify_project_access(db, file.project_id, current_user)
        return file

    @classmethod
    def delete_file(cls, db: Session, file_id: UUID, current_user: User) -> None:
        file = WorkspaceRepository.get_file(db, file_id)
        if not file:
            raise HTTPException(status_code=404, detail="File not found")
        cls._verify_project_access(db, file.project_id, current_user)
        WorkspaceRepository.soft_delete_file(db, file)

    @classmethod
    def duplicate_file(cls, db: Session, file_id: UUID, current_user: User) -> File:
        file = cls.get_file(db, file_id, current_user)

        base_name = file.name
        ext = ""
        parts = file.name.rsplit('.', 1)
        if len(parts) > 1:
            base_name, ext = parts[0], "." + parts[1]

        # Find unique name — cap iterations to prevent an adversarial loop
        _MAX_COPY_ATTEMPTS = 100
        counter = 1
        new_name = f"{base_name} copy{ext}"
        while WorkspaceRepository.get_file_by_name(db, file.project_id, new_name, file.folder_id):
            counter += 1
            if counter > _MAX_COPY_ATTEMPTS:
                raise HTTPException(
                    status_code=409,
                    detail="Too many copies of this file already exist."
                )
            new_name = f"{base_name} copy {counter}{ext}"

        create_schema = FileCreate(
            name=new_name,
            project_id=file.project_id,
            folder_id=file.folder_id,
            content=file.content,
            language=file.language,
            extension=file.extension
        )
        return WorkspaceRepository.create_file(db, create_schema)

    # ---------------------------------------------------------
    # Save Engine & Versions
    # ---------------------------------------------------------
    @classmethod
    def save_file(cls, db: Session, file_id: UUID, expected_version: int, content: str, current_user: User) -> File:
        file = WorkspaceRepository.get_file(db, file_id, for_update=True)
        if not file:
            raise HTTPException(status_code=404, detail="File not found")
        cls._verify_project_access(db, file.project_id, current_user)
        
        if file.is_read_only:
            raise HTTPException(status_code=403, detail="File is read-only")
            
        if expected_version < file.version:
            raise HTTPException(status_code=409, detail=f"Conflict: File has been modified by another process. Expected {expected_version}, but got {file.version}.")
            
        # Update content and increment version
        file.content = content
        file.size = len(content.encode('utf-8'))
        file.version += 1
        
        # Create Version History
        WorkspaceRepository.create_file_version(db, file, current_user.id)
        
        db.commit()
        db.refresh(file)
        return file

    @classmethod
    def save_batch(cls, db: Session, requests: List[Any], current_user: User) -> List[File]:
        # 'requests' is a list of FileSaveRequest from schemas
        files_to_save = []
        for req in requests:
            file = WorkspaceRepository.get_file(db, req.id, for_update=True)
            if not file:
                raise HTTPException(status_code=404, detail=f"File not found: {req.id}")
            cls._verify_project_access(db, file.project_id, current_user)
            
            if file.is_read_only:
                raise HTTPException(status_code=403, detail=f"File is read-only: {file.name}")
                
            if req.expected_version < file.version:
                raise HTTPException(status_code=409, detail=f"Conflict on {file.name}: File has been modified.")
                
            files_to_save.append((file, req.content))
            
        # Commit all if no conflicts found
        for file, content in files_to_save:
            file.content = content
            file.size = len(content.encode('utf-8'))
            file.version += 1
            WorkspaceRepository.create_file_version(db, file, current_user.id)
            
        db.commit()
        for file, _ in files_to_save:
            db.refresh(file)
            
        return [f for f, _ in files_to_save]

    @classmethod
    def get_file_versions(cls, db: Session, file_id: UUID, current_user: User) -> List[Any]:
        file = WorkspaceRepository.get_file(db, file_id)
        if not file:
            raise HTTPException(status_code=404, detail="File not found")
        cls._verify_project_access(db, file.project_id, current_user)
        return WorkspaceRepository.get_file_versions(db, file_id)

    @classmethod
    def get_file_version(cls, db: Session, file_id: UUID, version_number: int, current_user: User) -> Any:
        file = WorkspaceRepository.get_file(db, file_id)
        if not file:
            raise HTTPException(status_code=404, detail="File not found")
        cls._verify_project_access(db, file.project_id, current_user)
        
        version = WorkspaceRepository.get_file_version(db, file_id, version_number)
        if not version:
            raise HTTPException(status_code=404, detail="Version not found")
        return version

    @classmethod
    def restore_version(cls, db: Session, file_id: UUID, version_number: int, current_user: User) -> File:
        file = WorkspaceRepository.get_file(db, file_id)
        if not file:
            raise HTTPException(status_code=404, detail="File not found")
        cls._verify_project_access(db, file.project_id, current_user)
        
        if file.is_read_only:
            raise HTTPException(status_code=403, detail="File is read-only")

        version = WorkspaceRepository.get_file_version(db, file_id, version_number)
        if not version:
            raise HTTPException(status_code=404, detail="Version not found")

        # Update file to restored content
        file.content = version.content
        file.size = version.size
        file.version += 1
        
        # Create new version tracking the restoration
        WorkspaceRepository.create_file_version(db, file, current_user.id)
        
        db.commit()
        db.refresh(file)
        return file

    @classmethod
    def delete_version(cls, db: Session, file_id: UUID, version_number: int, current_user: User) -> None:
        file = WorkspaceRepository.get_file(db, file_id)
        if not file:
            raise HTTPException(status_code=404, detail="File not found")
        cls._verify_project_access(db, file.project_id, current_user)
        
        version = WorkspaceRepository.get_file_version(db, file_id, version_number)
        if not version:
            raise HTTPException(status_code=404, detail="Version not found")
            
        WorkspaceRepository.delete_file_version(db, version)

    # ---------------------------------------------------------
    # Tree
    # ---------------------------------------------------------
    @classmethod
    def get_workspace_tree(cls, db: Session, project_id: UUID, current_user: User) -> WorkspaceTreeResponse:
        project = cls._verify_project_access(db, project_id, current_user)
        
        folders = WorkspaceRepository.get_project_folders(db, project_id)
        files = WorkspaceRepository.get_project_files(db, project_id)
        
        # Build tree representation
        folder_dict = {}
        root_folders = []
        root_files = []
        
        for f in folders:
            folder_dict[f.id] = TreeFolder(
                id=f.id,
                name=f.name,
                path=f.path,
                updated_at=f.updated_at,
                files=[],
                children=[]
            )
            
        for f in folders:
            if f.parent_id and f.parent_id in folder_dict:
                folder_dict[f.parent_id].children.append(folder_dict[f.id])
            else:
                root_folders.append(folder_dict[f.id])
                
        for file in files:
            t_file = TreeFile(
                id=file.id,
                name=file.name,
                extension=file.extension,
                language=file.language,
                size=file.size,
                updated_at=file.updated_at
            )
            if file.folder_id and file.folder_id in folder_dict:
                folder_dict[file.folder_id].files.append(t_file)
            else:
                root_files.append(t_file)
                
        # Sort logic: Folders first (already alpha via DB), then files (alpha via DB)
        
        return WorkspaceTreeResponse(
            project_id=project.id,
            name=project.name,
            folders=root_folders,
            files=root_files
        )
