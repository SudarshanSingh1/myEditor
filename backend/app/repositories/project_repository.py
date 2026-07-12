from typing import Optional, List, Tuple
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc

from app.models.project import Project

class ProjectRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, project_id: UUID) -> Optional[Project]:
        return self.db.query(Project).filter(
            Project.id == project_id
        ).first()

    def get_by_slug(self, owner_id: UUID, slug: str) -> Optional[Project]:
        return self.db.query(Project).filter(
            Project.owner_id == owner_id,
            Project.slug == slug,
            Project.deleted_at == None
        ).first()

    def get_user_projects(
        self,
        owner_id: UUID,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        language: Optional[str] = None,
        favorite: Optional[bool] = None,
        sort_by: str = "updated_at",
        deleted: bool = False
    ) -> Tuple[List[Project], int]:
        
        query = select(Project).where(Project.owner_id == owner_id)
        
        if deleted:
            query = query.where(Project.deleted_at != None)
        else:
            query = query.where(Project.deleted_at == None)

        if search:
            query = query.where(Project.name.ilike(f"%{search}%"))
            
        if language:
            query = query.where(Project.language == language)
            
        if favorite is not None:
            query = query.where(Project.favorite == favorite)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total = self.db.execute(count_query).scalar_one()

        # Sorting
        if sort_by == "updated_at":
            query = query.order_by(desc(Project.updated_at))
        elif sort_by == "last_opened_at":
            query = query.order_by(desc(Project.last_opened_at))
        elif sort_by == "created_at":
            query = query.order_by(desc(Project.created_at))
        elif sort_by == "name":
            query = query.order_by(Project.name.asc())
        else:
            query = query.order_by(desc(Project.updated_at))

        # Pagination
        query = query.offset(skip).limit(limit)
        
        projects = self.db.execute(query).scalars().all()
        return list(projects), total

    def create(self, project: Project) -> Project:
        self.db.add(project)
        self.db.commit()
        self.db.refresh(project)
        return project

    def update(self, project: Project) -> Project:
        project.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(project)
        return project

    def soft_delete(self, project: Project) -> Project:
        project.deleted_at = datetime.now(timezone.utc)
        project.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(project)
        return project

    def restore(self, project: Project) -> Project:
        project.deleted_at = None
        project.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(project)
        return project

    def hard_delete(self, project: Project) -> None:
        from app.models.execution_log import ExecutionLog
        from app.models.workspace import File, Folder, FileVersion
        from sqlalchemy import delete

        # Manually delete child records to avoid IntegrityError with circular/self-referencing folders
        # 1. Delete Execution Logs
        self.db.execute(delete(ExecutionLog).where(ExecutionLog.project_id == project.id))
        
        # 2. Delete File Versions (they reference Files)
        # We need a subquery for files in this project
        file_ids_subquery = select(File.id).where(File.project_id == project.id)
        self.db.execute(delete(FileVersion).where(FileVersion.file_id.in_(file_ids_subquery)))
        
        # 3. Delete Files
        self.db.execute(delete(File).where(File.project_id == project.id))
        
        # 4. Delete Folders (to handle self-referencing parent_id, just delete all by project_id)
        self.db.execute(delete(Folder).where(Folder.project_id == project.id))
        
        # 5. Delete the Project itself bypassing ORM relationship cascade
        self.db.execute(delete(Project).where(Project.id == project.id))
        self.db.commit()
