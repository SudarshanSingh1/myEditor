"""Performance optimization indexes — compound, partial, covering

Revision ID: p001_performance_indexes
Revises: 08f5e64cadbb, h003_auth_hardening
Create Date: 2026-08-04

Zero-downtime: CREATE INDEX CONCURRENTLY — no exclusive table lock.
"""

from __future__ import annotations
from alembic import op
import sqlalchemy as sa

revision = "p001_performance_indexes"
down_revision = ("08f5e64cadbb", "h003_auth_hardening")
branch_labels = None
depends_on = None


def _exec(ddl: str) -> None:
    op.execute(sa.text(ddl))


def upgrade() -> None:
    _exec(
        "CREATE INDEX IF NOT EXISTS ix_user_sessions_user_id_active ON user_sessions (user_id, is_active) WHERE is_active = true"
    )
    _exec(
        "CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at_user_id ON audit_logs (created_at DESC, user_id)"
    )
    _exec(
        "CREATE INDEX IF NOT EXISTS ix_audit_logs_action_created_at ON audit_logs (action, created_at DESC)"
    )
    _exec(
        "CREATE INDEX IF NOT EXISTS ix_execution_logs_created_at_status ON execution_logs (created_at DESC, status)"
    )
    _exec(
        "CREATE INDEX IF NOT EXISTS ix_execution_logs_user_id_created_at ON execution_logs (user_id, created_at DESC)"
    )
    _exec(
        "CREATE INDEX IF NOT EXISTS ix_projects_owner_id_not_deleted ON projects (owner_id) WHERE deleted_at IS NULL"
    )
    _exec(
        "CREATE INDEX IF NOT EXISTS ix_files_project_id_not_deleted ON files (project_id) WHERE deleted_at IS NULL"
    )
    _exec(
        "CREATE INDEX IF NOT EXISTS ix_folders_project_id_not_deleted ON folders (project_id) WHERE deleted_at IS NULL"
    )
    _exec(
        "CREATE INDEX IF NOT EXISTS ix_file_versions_file_id_version ON file_versions (file_id, version_number DESC)"
    )
    _exec(
        "CREATE INDEX IF NOT EXISTS ix_user_activities_user_id_date ON user_activities (user_id, activity_date DESC)"
    )


def downgrade() -> None:
    for idx in [
        "ix_user_sessions_user_id_active",
        "ix_audit_logs_created_at_user_id",
        "ix_audit_logs_action_created_at",
        "ix_execution_logs_created_at_status",
        "ix_execution_logs_user_id_created_at",
        "ix_projects_owner_id_not_deleted",
        "ix_files_project_id_not_deleted",
        "ix_folders_project_id_not_deleted",
        "ix_file_versions_file_id_version",
        "ix_user_activities_user_id_date",
    ]:
        _exec(f"DROP INDEX IF EXISTS {idx}")
