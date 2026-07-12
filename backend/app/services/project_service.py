import re
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectListResponse, ProjectResponse
import logging

logger = logging.getLogger(__name__)
from app.repositories.project_repository import ProjectRepository
from app.models.user import User
from app.schemas.workspace import FileCreate, FolderCreate
from app.services.workspace_service import WorkspaceService

class ProjectService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ProjectRepository(db)

    def _generate_slug(self, name: str, owner_id: UUID) -> str:
        # Basic slugify
        base_slug = re.sub(r'[^\w\-]', '', name.lower().replace(' ', '-'))
        if not base_slug:
            base_slug = "project"
            
        slug = base_slug
        counter = 1
        
        while self.repo.get_by_slug(owner_id, slug):
            slug = f"{base_slug}-{counter}"
            counter += 1
            
        return slug

    def _get_project_and_check_owner(self, project_id: UUID, user_id: UUID, allow_deleted: bool = False) -> Project:
        project = self.repo.get_by_id(project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        
        if project.owner_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions to access this project")
            
        if not allow_deleted and project.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found (in trash)")
            
        return project

    def get_projects(
        self, 
        user_id: UUID, 
        page: int = 1, 
        size: int = 20, 
        search: Optional[str] = None,
        language: Optional[str] = None,
        favorite: Optional[bool] = None,
        sort_by: str = "updated_at",
        deleted: bool = False
    ) -> ProjectListResponse:
        
        skip = (page - 1) * size
        projects, total = self.repo.get_user_projects(
            owner_id=user_id,
            skip=skip,
            limit=size,
            search=search,
            language=language,
            favorite=favorite,
            sort_by=sort_by,
            deleted=deleted
        )
        
        return ProjectListResponse(
            items=[ProjectResponse.model_validate(p) for p in projects],
            total=total,
            page=page,
            size=size
        )

    def get_project(self, project_id: UUID, user_id: UUID) -> ProjectResponse:
        project = self._get_project_and_check_owner(project_id, user_id)
        
        # Update last_opened_at when fetching a single project
        project.last_opened_at = datetime.now(timezone.utc)
        self.repo.update(project)
        
        return ProjectResponse.model_validate(project)

    def create_project(self, data: ProjectCreate, user_id: UUID) -> ProjectResponse:
        slug = self._generate_slug(data.name, user_id)
        
        project = Project(
            owner_id=user_id,
            name=data.name.strip(),
            description=data.description,
            language=data.language,
            visibility=data.visibility,
            color=data.color,
            icon=data.icon,
            slug=slug
        )
        
        created = self.repo.create(project)
        
        # Auto-generate starter files
        self._generate_starter_files(created, user_id)
        
        return ProjectResponse.model_validate(created)

    def _generate_starter_files(self, project: Project, user_id: UUID) -> None:
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return
            
        templates = {
            "c": {
                "src": {"main.c": '#include <stdio.h>\n\nint main() {\n  printf("Hello, World!\\n");\n  return 0;\n}\n'},
                "include": {},
                "Makefile": 'all:\n\tgcc src/main.c -o main\n\nclean:\n\trm -f main\n',
                "README.md": '# C Project\n\nWelcome to your new C project!\n'
            },
            "c++": {
                "src": {"main.cpp": '#include <iostream>\n\nint main() {\n  std::cout << "Hello, World!" << std::endl;\n  return 0;\n}\n'},
                "include": {},
                "Makefile": 'all:\n\tg++ src/main.cpp -o main\n\nclean:\n\trm -f main\n',
                "README.md": '# C++ Project\n\nWelcome to your new C++ project!\n'
            },
            "python": {
                "main.py": 'print("Hello, World!")\n',
                "requirements.txt": '',
                "README.md": '# Python Project\n\nWelcome to your new Python project!\n'
            },
            "javascript": {
                "src": {"index.js": 'console.log("Hello, World!");\n'},
                "package.json": '{\n  "name": "js-project",\n  "version": "1.0.0",\n  "scripts": {\n    "start": "node src/index.js"\n  }\n}\n',
                "README.md": '# JavaScript Project\n\nWelcome to your new JS project!\n'
            },
            "typescript": {
                "src": {"index.ts": 'console.log("Hello, TypeScript!");\n'},
                "package.json": '{\n  "name": "ts-project",\n  "version": "1.0.0",\n  "scripts": {\n    "start": "tsx src/index.ts"\n  }\n}\n',
                "tsconfig.json": '{\n  "compilerOptions": {\n    "target": "es2022",\n    "module": "commonjs",\n    "strict": true\n  }\n}\n',
                "README.md": '# TypeScript Project\n\nWelcome to your new TS project!\n'
            },
            "java": {
                "src": {"Main.java": 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, World!");\n  }\n}\n'},
                "README.md": '# Java Project\n\nWelcome to your new Java project!\n'
            },
            "go": {
                "main.go": 'package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Hello, World!")\n}\n',
                "go.mod": 'module example.com/project\n\ngo 1.20\n',
                "README.md": '# Go Project\n\nWelcome to your new Go project!\n'
            },
            "rust": {
                "src": {"main.rs": 'fn main() {\n  println!("Hello, World!");\n}\n'},
                "Cargo.toml": '[package]\nname = "project"\nversion = "0.1.0"\nedition = "2021"\n\n[dependencies]\n',
                "README.md": '# Rust Project\n\nWelcome to your new Rust project!\n'
            },
            "html/css": {
                "index.html": '<!DOCTYPE html>\n<html>\n<head>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>Hello, World!</h1>\n  <script src="script.js"></script>\n</body>\n</html>\n',
                "style.css": 'body {\n  font-family: sans-serif;\n}\n',
                "script.js": 'console.log("Hello, HTML/CSS!");\n'
            }
        }
        
        lang_key = project.language.lower() if project.language else "python"
        tree_def = templates.get(lang_key, {"main.txt": "Hello!"})
        
        def _create_tree(current_level: dict, parent_id: UUID = None):
            for name, content in current_level.items():
                if isinstance(content, dict):
                    # It's a folder
                    folder_in = FolderCreate(
                        project_id=project.id,
                        name=name,
                        parent_id=parent_id
                    )
                    try:
                        folder = WorkspaceService.create_folder(self.db, folder_in, user)
                        _create_tree(content, folder.id)
                    except Exception as e:
                        logger.error(f"Error creating folder {name}: {e}", exc_info=True)
                else:
                    # It's a file
                    file_in = FileCreate(
                        project_id=project.id,
                        name=name,
                        content=content,
                        language=lang_key,
                        parent_id=parent_id
                    )
                    try:
                        WorkspaceService.create_file(self.db, file_in, user)
                    except Exception as e:
                        logger.error(f"Error creating file {name}: {e}", exc_info=True)
                        
        _create_tree(tree_def)

    def update_project(self, project_id: UUID, data: ProjectUpdate, user_id: UUID) -> ProjectResponse:
        project = self._get_project_and_check_owner(project_id, user_id)
        
        update_data = data.model_dump(exclude_unset=True)
        
        # Check if name is being updated to generate a new slug
        if "name" in update_data and update_data["name"]:
            name = update_data["name"].strip()
            if name != project.name:
                project.slug = self._generate_slug(name, user_id)
        
        for key, value in update_data.items():
            if key == "name" and value:
                setattr(project, key, value.strip())
            else:
                setattr(project, key, value)
                
        updated = self.repo.update(project)
        return ProjectResponse.model_validate(updated)

    def soft_delete_project(self, project_id: UUID, user_id: UUID) -> ProjectResponse:
        project = self._get_project_and_check_owner(project_id, user_id)
        deleted = self.repo.soft_delete(project)
        return ProjectResponse.model_validate(deleted)

    def restore_project(self, project_id: UUID, user_id: UUID) -> ProjectResponse:
        project = self._get_project_and_check_owner(project_id, user_id, allow_deleted=True)
        if not project.deleted_at:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project is not in trash")
            
        restored = self.repo.restore(project)
        return ProjectResponse.model_validate(restored)

    def hard_delete_project(self, project_id: UUID, user_id: UUID) -> None:
        project = self._get_project_and_check_owner(project_id, user_id, allow_deleted=True)
        if not project.deleted_at:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project must be soft-deleted first")
            
        self.repo.hard_delete(project)

    def empty_trash(self, user_id: UUID) -> None:
        trashed_projects, _ = self.repo.get_user_projects(user_id, limit=1000, deleted=True)
        for project in trashed_projects:
            self.repo.hard_delete(project)

    def toggle_favorite(self, project_id: UUID, user_id: UUID) -> ProjectResponse:
        project = self._get_project_and_check_owner(project_id, user_id)
        project.favorite = not project.favorite
        updated = self.repo.update(project)
        return ProjectResponse.model_validate(updated)

    def duplicate_project(self, project_id: UUID, user_id: UUID) -> ProjectResponse:
        source_project = self._get_project_and_check_owner(project_id, user_id)
        
        new_name = f"{source_project.name} (Copy)"
        slug = self._generate_slug(new_name, user_id)
        
        new_project = Project(
            owner_id=user_id,
            name=new_name,
            description=source_project.description,
            language=source_project.language,
            visibility=source_project.visibility,
            color=source_project.color,
            icon=source_project.icon,
            slug=slug
        )
        
        created = self.repo.create(new_project)
        return ProjectResponse.model_validate(created)
