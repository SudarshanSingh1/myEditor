from sqlalchemy.orm import Session
from sqlalchemy import select, update
from uuid import UUID
from datetime import datetime, timezone
from typing import List, Optional

from app.models.workspace import Folder, File, FileVersion
from app.schemas.workspace import FolderCreate, FolderUpdate, FileCreate, FileUpdate


class WorkspaceRepository:
    # ---------------------------------------------------------
    # Folders
    # ---------------------------------------------------------
    @staticmethod
    def get_folder(db: Session, folder_id: UUID) -> Optional[Folder]:
        return db.execute(
            select(Folder).where(Folder.id == folder_id, Folder.deleted_at.is_(None))
        ).scalar_one_or_none()

    @staticmethod
    def get_folder_by_name(
        db: Session, project_id: UUID, name: str, parent_id: Optional[UUID] = None
    ) -> Optional[Folder]:
        stmt = select(Folder).where(
            Folder.project_id == project_id,
            Folder.name == name,
            Folder.parent_id == parent_id,
            Folder.deleted_at.is_(None),
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def create_folder(
        db: Session, obj_in: FolderCreate, path: str, depth: int
    ) -> Folder:
        db_obj = Folder(
            project_id=obj_in.project_id,
            parent_id=obj_in.parent_id,
            name=obj_in.name,
            path=path,
            depth=depth,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    @staticmethod
    def update_folder(
        db: Session,
        db_obj: Folder,
        obj_in: FolderUpdate,
        new_path: Optional[str] = None,
        new_depth: Optional[int] = None,
    ) -> Folder:
        update_data = obj_in.model_dump(exclude_unset=True)
        if new_path is not None:
            update_data["path"] = new_path
        if new_depth is not None:
            update_data["depth"] = new_depth

        for field, value in update_data.items():
            setattr(db_obj, field, value)

        db.commit()
        db.refresh(db_obj)
        return db_obj

    @staticmethod
    def _get_all_descendants_ids(db: Session, parent_id: UUID) -> List[UUID]:
        ids = []
        children = (
            db.execute(
                select(Folder.id).where(
                    Folder.parent_id == parent_id, Folder.deleted_at.is_(None)
                )
            )
            .scalars()
            .all()
        )
        for child_id in children:
            ids.append(child_id)
            ids.extend(WorkspaceRepository._get_all_descendants_ids(db, child_id))
        return ids

    @staticmethod
    def soft_delete_folder_cascade(db: Session, folder: Folder) -> None:
        """Soft delete folder and all descendants recursively using parent_id."""
        now = datetime.now(timezone.utc)

        descendant_ids = WorkspaceRepository._get_all_descendants_ids(db, folder.id)
        all_folder_ids = [folder.id] + descendant_ids

        # We delete all folders
        db.execute(
            update(Folder)
            .where(Folder.id.in_(all_folder_ids))
            .where(Folder.deleted_at.is_(None))
            .values(deleted_at=now)
        )

        # We delete all files inside those folders
        db.execute(
            update(File)
            .where(File.folder_id.in_(all_folder_ids))
            .where(File.deleted_at.is_(None))
            .values(deleted_at=now)
        )

        db.commit()

    # ---------------------------------------------------------
    # Files
    # ---------------------------------------------------------
    @staticmethod
    def get_file(
        db: Session, file_id: UUID, for_update: bool = False
    ) -> Optional[File]:
        stmt = select(File).where(File.id == file_id, File.deleted_at.is_(None))
        if for_update:
            stmt = stmt.with_for_update()
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_file_by_name(
        db: Session, project_id: UUID, name: str, folder_id: Optional[UUID] = None
    ) -> Optional[File]:
        stmt = select(File).where(
            File.project_id == project_id,
            File.name == name,
            File.folder_id == folder_id,
            File.deleted_at.is_(None),
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def create_file(db: Session, obj_in: FileCreate) -> File:
        size = len(obj_in.content.encode("utf-8")) if obj_in.content else 0
        db_obj = File(
            project_id=obj_in.project_id,
            folder_id=obj_in.folder_id,
            name=obj_in.name,
            extension=obj_in.extension,
            language=obj_in.language,
            content=obj_in.content,
            size=size,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    @staticmethod
    def update_file(
        db: Session, db_obj: File, obj_in: FileUpdate, extension: Optional[str] = None
    ) -> File:
        update_data = obj_in.model_dump(exclude_unset=True)
        if extension is not None:
            update_data["extension"] = extension

        if "content" in update_data and update_data["content"] is not None:
            update_data["size"] = len(update_data["content"].encode("utf-8"))

        for field, value in update_data.items():
            setattr(db_obj, field, value)

        db.commit()
        db.refresh(db_obj)
        return db_obj

    @staticmethod
    def soft_delete_file(db: Session, file: File) -> None:
        file.deleted_at = datetime.now(timezone.utc)
        db.commit()

    # ---------------------------------------------------------
    # Tree
    # ---------------------------------------------------------
    @staticmethod
    def get_project_folders(db: Session, project_id: UUID) -> List[Folder]:
        return (
            db.execute(
                select(Folder)
                .where(Folder.project_id == project_id, Folder.deleted_at.is_(None))
                .order_by(Folder.name)
            )
            .scalars()
            .all()
        )

    @staticmethod
    def get_project_files(db: Session, project_id: UUID) -> List[File]:
        # Explicitly select only the columns needed for the tree view.
        # Excluding `content` (TEXT) prevents loading MBs of file data
        # just to display filenames in the sidebar.
        return (
            db.execute(
                select(
                    File.id,
                    File.project_id,
                    File.folder_id,
                    File.name,
                    File.extension,
                    File.language,
                    File.size,
                    File.version,
                    File.is_read_only,
                    File.updated_at,
                    File.deleted_at,
                )
                .where(File.project_id == project_id, File.deleted_at.is_(None))
                .order_by(File.name)
            )
            .mappings()
            .all()
        )

    # ---------------------------------------------------------
    # Versions
    # ---------------------------------------------------------
    @staticmethod
    def create_file_version(
        db: Session, file: File, current_user_id: Optional[UUID] = None
    ) -> FileVersion:
        version = FileVersion(
            file_id=file.id,
            version_number=file.version,
            content=file.content,
            size=file.size,
            created_by=current_user_id,
        )
        db.add(version)
        return version

    @staticmethod
    def get_file_versions(db: Session, file_id: UUID) -> List[FileVersion]:
        return (
            db.execute(
                select(FileVersion)
                .where(FileVersion.file_id == file_id)
                .order_by(FileVersion.version_number.desc())
            )
            .scalars()
            .all()
        )

    @staticmethod
    def get_file_version(
        db: Session, file_id: UUID, version_number: int
    ) -> Optional[FileVersion]:
        return db.execute(
            select(FileVersion).where(
                FileVersion.file_id == file_id,
                FileVersion.version_number == version_number,
            )
        ).scalar_one_or_none()

    @staticmethod
    def delete_file_version(db: Session, version: FileVersion) -> None:
        db.delete(version)
        db.commit()
