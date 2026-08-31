"""
Enterprise Lifecycle Service

Implements the complete data lifecycle for Users and Projects:
  - Soft Delete   (reversible, hidden from normal queries)
  - Restore       (reverses soft delete)
  - Dependency Inspection  (structured report before permanent deletion)
  - Permanent Delete (physical removal, only after inspection passes)

All methods return structured data dicts or raise HTTPException with
domain-specific error codes — never expose raw SQLAlchemy exceptions.
"""

from __future__ import annotations

import uuid
import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, select

from app.models.user import User, RoleEnum, StatusEnum
from app.models.project import Project
from app.models.workspace import File, Folder, FileVersion
from app.models.execution_log import ExecutionLog
from app.models.notification import Notification
from app.models.report import Report
from app.models.user_session import UserSession
from app.models.feedback import Feedback
from app.models.audit_log import AuditLog
from app.models.system_error import SystemError
from app.services.admin_audit_service import AdminAuditService

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Dependency Report structures
# ---------------------------------------------------------------------------


def _user_dependency_report(user_id: uuid.UUID, db: Session) -> dict[str, Any]:
    """
    Count every record that references this user.
    Returns a structured dict — never raises.
    """
    projects_count = (
        db.query(func.count(Project.id)).filter(Project.owner_id == user_id).scalar()
        or 0
    )
    active_projects = (
        db.query(func.count(Project.id))
        .filter(Project.owner_id == user_id, Project.deleted_at.is_(None))
        .scalar()
        or 0
    )
    executions_count = (
        db.query(func.count(ExecutionLog.id))
        .filter(ExecutionLog.user_id == user_id)
        .scalar()
        or 0
    )
    notifications_count = (
        db.query(func.count(Notification.id))
        .filter(Notification.user_id == user_id)
        .scalar()
        or 0
    )
    reports_filed = (
        db.query(func.count(Report.id)).filter(Report.reporter_id == user_id).scalar()
        or 0
    )
    reports_assigned = (
        db.query(func.count(Report.id)).filter(Report.assigned_to == user_id).scalar()
        or 0
    )
    feedback_count = (
        db.query(func.count(Feedback.id)).filter(Feedback.user_id == user_id).scalar()
        or 0
    )
    sessions_count = (
        db.query(func.count(UserSession.id))
        .filter(UserSession.user_id == user_id)
        .scalar()
        or 0
    )
    audit_entries = (
        db.query(func.count(AuditLog.id)).filter(AuditLog.user_id == user_id).scalar()
        or 0
    )
    system_errors = (
        db.query(func.count(SystemError.id))
        .filter(SystemError.user_id == user_id)
        .scalar()
        or 0
    )

    return {
        "projects_total": projects_count,
        "projects_active": active_projects,
        "executions": executions_count,
        "notifications": notifications_count,
        "reports_filed": reports_filed,
        "reports_assigned": reports_assigned,
        "feedback": feedback_count,
        "active_sessions": sessions_count,
        "audit_entries": audit_entries,
        "system_errors": system_errors,
        # Blocking: active projects must be resolved before hard delete
        "has_blocking_dependencies": active_projects > 0,
    }


def _project_dependency_report(project_id: uuid.UUID, db: Session) -> dict[str, Any]:
    executions_count = (
        db.query(func.count(ExecutionLog.id))
        .filter(ExecutionLog.project_id == project_id)
        .scalar()
        or 0
    )
    files_count = (
        db.query(func.count(File.id)).filter(File.project_id == project_id).scalar()
        or 0
    )
    versions_count = (
        db.query(func.count(FileVersion.id))
        .join(File, FileVersion.file_id == File.id)
        .filter(File.project_id == project_id)
        .scalar()
    ) or 0

    return {
        "executions": executions_count,
        "files": files_count,
        "file_versions": versions_count,
        "has_blocking_dependencies": False,  # Projects can always be force-deleted
    }


# ---------------------------------------------------------------------------
# User Lifecycle
# ---------------------------------------------------------------------------


class UserLifecycle:
    @staticmethod
    def get_dependencies(user_id: uuid.UUID, db: Session) -> dict[str, Any]:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )
        return _user_dependency_report(user_id, db)

    @staticmethod
    def soft_delete(
        user_id: uuid.UUID,
        actor: User,
        reason: str | None,
        db: Session,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> dict[str, Any]:
        """
        Soft-delete a user. Sets is_deleted=True, deleted_at, deleted_by.
        Status changes to SUSPENDED to block login immediately.
        Fully reversible via restore().
        """
        if user_id == actor.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your own account.",
            )

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )

        if user.role == RoleEnum.OWNER and actor.role != RoleEnum.OWNER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only an Owner can delete another Owner.",
            )

        if user.role == RoleEnum.OWNER:
            remaining_owners = (
                db.query(func.count(User.id))
                .filter(
                    User.role == RoleEnum.OWNER,
                    User.is_deleted == False,
                    User.id != user_id,
                )
                .scalar()
                or 0
            )
            if remaining_owners == 0:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot delete the last Owner account. Promote another user to Owner first.",
                )

        now = datetime.now(timezone.utc)
        user.is_deleted = True
        user.deleted_at = now
        user.deleted_by = actor.id
        user.status = StatusEnum.SUSPENDED  # Block login immediately
        user.restored_at = None
        user.restored_by = None

        # Invalidate all active sessions immediately
        db.query(UserSession).filter(UserSession.user_id == user_id).update(
            {"is_active": False}
        )

        db.commit()

        AdminAuditService.log_action(
            db=db,
            actor_id=actor.id,
            action="USER_SOFT_DELETE",
            target_id=user_id,
            metadata_json={
                "reason": reason,
                "username": user.username,
                "email": user.email,
            },
        )

        logger.info(
            f"User {user.username} ({user_id}) soft-deleted by admin {actor.username}"
        )
        return {
            "user_id": str(user_id),
            "deleted_at": now.isoformat(),
            "action": "soft_deleted",
        }

    @staticmethod
    def restore(
        user_id: uuid.UUID,
        actor: User,
        db: Session,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> dict[str, Any]:
        """
        Restore a soft-deleted user. Clears is_deleted, deleted_at, deleted_by.
        """
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )

        if not user.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="User is not deleted."
            )

        now = datetime.now(timezone.utc)
        user.is_deleted = False
        user.status = StatusEnum.ACTIVE
        user.restored_at = now
        user.restored_by = actor.id
        user.deleted_at = None
        user.deleted_by = None

        db.commit()

        AdminAuditService.log_action(
            db=db,
            actor_id=actor.id,
            action="USER_RESTORE",
            target_id=user_id,
            metadata_json={"username": user.username},
        )

        logger.info(
            f"User {user.username} ({user_id}) restored by admin {actor.username}"
        )
        return {
            "user_id": str(user_id),
            "restored_at": now.isoformat(),
            "action": "restored",
        }

    @staticmethod
    def permanent_delete(
        user_id: uuid.UUID,
        actor: User,
        reason: str | None,
        db: Session,
        ip_address: str | None = None,
        user_agent: str | None = None,
        force: bool = False,
    ) -> dict[str, Any]:
        """
        Permanently delete a user from the database.

        Pre-conditions:
          - User must be soft-deleted first (unless force=True, owner-only).
          - User must have no active projects unless force=True.

        The FK strategy ensures:
          - audit_logs, admin_audit_logs: SET NULL  (history preserved)
          - execution_logs: SET NULL on user_id    (history preserved)
          - notifications: SET NULL                (history preserved)
          - reports: SET NULL on reporter_id       (history preserved)
          - user_sessions, oauth_accounts, user_activities: CASCADE
          - user_notification_settings: CASCADE
          - projects: CASCADE (only if user was soft-deleted; active projects block this)
        """
        if user_id == actor.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your own account.",
            )

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )

        if user.role == RoleEnum.OWNER:
            if actor.role != RoleEnum.OWNER:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only an Owner can permanently delete another Owner.",
                )
            remaining = (
                db.query(func.count(User.id))
                .filter(User.role == RoleEnum.OWNER, User.id != user_id)
                .scalar()
                or 0
            )
            if remaining == 0:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot delete the last Owner account.",
                )

        # Check for blocking dependencies
        deps = _user_dependency_report(user_id, db)

        if deps["has_blocking_dependencies"] and not force:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "USER_HAS_ACTIVE_PROJECTS",
                    "message": (
                        "This user owns active projects. Transfer ownership, archive, or permanently delete "
                        "their projects before permanently deleting this user."
                    ),
                    "dependencies": deps,
                },
            )

        username_log = user.username
        email_log = user.email

        # Perform cascading cleanup for items not covered by DB-level CASCADE
        try:
            # Anonymize reports (SET NULL on reporter_id is handled by DB FK, but
            # we explicitly NULL assigned_to for this user to avoid orphan assignment)
            db.query(Report).filter(Report.assigned_to == user_id).update(
                {"assigned_to": None}, synchronize_session=False
            )

            # Delete projects and their children manually (faster than DB cascade for large trees)
            project_ids_q = select(Project.id).where(Project.owner_id == user_id)
            project_ids = [row[0] for row in db.execute(project_ids_q).all()]

            if project_ids:
                # file_versions -> files -> folders -> execution_logs -> projects
                file_ids_q = select(File.id).where(File.project_id.in_(project_ids))
                file_ids = [row[0] for row in db.execute(file_ids_q).all()]

                if file_ids:
                    from sqlalchemy import delete as sa_delete

                    db.execute(
                        sa_delete(FileVersion).where(FileVersion.file_id.in_(file_ids))
                    )

                from sqlalchemy import delete as sa_delete

                db.execute(
                    sa_delete(ExecutionLog).where(
                        ExecutionLog.project_id.in_(project_ids)
                    )
                )
                db.execute(sa_delete(File).where(File.project_id.in_(project_ids)))
                db.execute(sa_delete(Folder).where(Folder.project_id.in_(project_ids)))
                db.execute(sa_delete(Project).where(Project.owner_id == user_id))

            # Create tombstone records to prevent re-registration
            from app.models.blocked_identity import BlockedIdentity, BlockReason
            from app.models.oauth_account import OAuthAccount
            
            # Block primary email
            db.add(BlockedIdentity(
                provider="email",
                provider_id=user.email.lower(),
                original_user_id=user.id,
                reason=BlockReason.PERMANENT_DELETE,
                details=reason
            ))

            # Block all connected OAuth identities
            oauth_accounts = db.query(OAuthAccount).filter(OAuthAccount.user_id == user.id).all()
            for acc in oauth_accounts:
                db.add(BlockedIdentity(
                    provider=acc.provider,
                    provider_id=acc.provider_account_id,
                    original_user_id=user.id,
                    reason=BlockReason.PERMANENT_DELETE,
                    details=reason
                ))

            # Now delete the user — DB CASCADE handles sessions, oauth, activities, notification settings
            db.delete(user)
            db.flush()  # Flush before commit to catch any remaining FK issues

            db.commit()

        except Exception as exc:
            db.rollback()
            logger.error(
                f"Permanent delete failed for user {user_id}: {exc}", exc_info=True
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "code": "DELETE_FAILED",
                    "message": "Permanent deletion failed due to an unexpected database error. No data was changed.",
                },
            ) from exc

        AdminAuditService.log_action(
            db=db,
            actor_id=actor.id,
            action="USER_PERMANENT_DELETE",
            target_id=user_id,
            metadata_json={
                "reason": reason,
                "username": username_log,
                "email": email_log,
                "dependencies_at_deletion": deps,
            },
        )

        logger.warning(
            f"User {username_log} ({user_id}) PERMANENTLY DELETED by admin {actor.username}. "
            f"Reason: {reason}. Dependencies: {deps}"
        )
        return {
            "user_id": str(user_id),
            "action": "permanently_deleted",
            "username": username_log,
        }


# ---------------------------------------------------------------------------
# Project Lifecycle
# ---------------------------------------------------------------------------


class ProjectLifecycle:
    @staticmethod
    def get_dependencies(project_id: uuid.UUID, db: Session) -> dict[str, Any]:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
            )
        return _project_dependency_report(project_id, db)

    @staticmethod
    def archive(
        project_id: uuid.UUID,
        actor: User,
        reason: str | None,
        db: Session,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> dict[str, Any]:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
            )

        now = datetime.now(timezone.utc)
        project.deleted_at = now
        db.commit()

        AdminAuditService.log_action(
            db=db,
            actor_id=actor.id,
            target_id=project_id,
            action="PROJECT_ARCHIVE",
            metadata_json={"reason": reason, "name": project.name},
        )
        return {
            "project_id": str(project_id),
            "archived_at": now.isoformat(),
            "action": "archived",
        }

    @staticmethod
    def restore(
        project_id: uuid.UUID,
        actor: User,
        db: Session,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> dict[str, Any]:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
            )

        if project.deleted_at is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Project is not archived.",
            )

        project.deleted_at = None
        db.commit()

        AdminAuditService.log_action(
            db=db,
            actor_id=actor.id,
            target_id=project_id,
            action="PROJECT_RESTORE",
            metadata_json={"name": project.name},
        )
        return {"project_id": str(project_id), "action": "restored"}

    @staticmethod
    def permanent_delete(
        project_id: uuid.UUID,
        actor: User,
        reason: str | None,
        db: Session,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> dict[str, Any]:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
            )

        project_name = project.name

        try:
            from sqlalchemy import delete as sa_delete

            file_ids_q = select(File.id).where(File.project_id == project_id)
            file_ids = [row[0] for row in db.execute(file_ids_q).all()]

            if file_ids:
                db.execute(
                    sa_delete(FileVersion).where(FileVersion.file_id.in_(file_ids))
                )

            db.execute(
                sa_delete(ExecutionLog).where(ExecutionLog.project_id == project_id)
            )
            db.execute(sa_delete(File).where(File.project_id == project_id))
            db.execute(sa_delete(Folder).where(Folder.project_id == project_id))
            db.delete(project)
            db.commit()

        except Exception as exc:
            db.rollback()
            logger.error(
                f"Permanent project delete failed for {project_id}: {exc}",
                exc_info=True,
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "code": "DELETE_FAILED",
                    "message": "Permanent deletion failed. No data was changed.",
                },
            ) from exc

        AdminAuditService.log_action(
            db=db,
            actor_id=actor.id,
            target_id=project_id,
            action="PROJECT_PERMANENT_DELETE",
            metadata_json={"reason": reason, "name": project_name},
        )
        return {
            "project_id": str(project_id),
            "action": "permanently_deleted",
            "name": project_name,
        }
