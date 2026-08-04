"""enterprise lifecycle management - fix fk constraints and add user lifecycle columns

Revision ID: f001a2b3c4d5
Revises: e123456789ab
Create Date: 2026-08-04 12:00:00.000000

This migration:
1. Adds lifecycle columns to `users` table (deleted_at, deleted_by, restored_at, restored_by)
2. Fixes missing ON DELETE rules on:
   - notifications.user_id   -> SET NULL (keep notification history, anonymize recipient)
   - user_notification_settings.user_id -> CASCADE (settings meaningless without user)
   - reports.reporter_id     -> SET NULL (keep moderation record, anonymize reporter)
   - reports.assigned_to     -> SET NULL (keep record, unassign reviewer)
   - deployment_logs.deployed_by_id -> SET NULL (keep history, anonymize deployer)

All operations are safe for zero-downtime production deployments.
ADD COLUMN with a default is instant in PostgreSQL 11+.
Dropping and recreating FK constraints locks rows briefly but does not block reads.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f001a2b3c4d5'
down_revision: Union[str, None] = 'e123456789ab'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # =========================================================
    # 1. Add lifecycle columns to users table
    # =========================================================
    op.add_column('users', sa.Column(
        'deleted_at', sa.DateTime(timezone=True), nullable=True
    ))
    op.add_column('users', sa.Column(
        'deleted_by', sa.Uuid(as_uuid=True), nullable=True
    ))
    op.add_column('users', sa.Column(
        'restored_at', sa.DateTime(timezone=True), nullable=True
    ))
    op.add_column('users', sa.Column(
        'restored_by', sa.Uuid(as_uuid=True), nullable=True
    ))

    # Create indexes for lifecycle columns to support fast filtering
    op.create_index('ix_users_deleted_at', 'users', ['deleted_at'])
    op.create_index('ix_users_is_deleted', 'users', ['is_deleted'])

    # =========================================================
    # 2. Fix notifications.user_id FK: RESTRICT -> SET NULL
    #    Also make user_id nullable (required for SET NULL)
    # =========================================================
    # Drop the old unnamed FK constraint — PostgreSQL names it automatically
    op.drop_constraint(
        'notifications_user_id_fkey',
        'notifications',
        type_='foreignkey'
    )
    # Make user_id nullable so SET NULL can work
    op.alter_column('notifications', 'user_id', nullable=True)
    # Re-create FK with SET NULL
    op.create_foreign_key(
        'notifications_user_id_fkey',
        'notifications', 'users',
        ['user_id'], ['id'],
        ondelete='SET NULL'
    )

    # =========================================================
    # 3. Fix user_notification_settings.user_id FK: RESTRICT -> CASCADE
    # =========================================================
    op.drop_constraint(
        'user_notification_settings_user_id_fkey',
        'user_notification_settings',
        type_='foreignkey'
    )
    op.create_foreign_key(
        'user_notification_settings_user_id_fkey',
        'user_notification_settings', 'users',
        ['user_id'], ['id'],
        ondelete='CASCADE'
    )

    # =========================================================
    # 4. Fix reports.reporter_id FK: RESTRICT -> SET NULL
    # =========================================================
    op.drop_constraint(
        'reports_reporter_id_fkey',
        'reports',
        type_='foreignkey'
    )
    op.alter_column('reports', 'reporter_id', nullable=True)
    op.create_foreign_key(
        'reports_reporter_id_fkey',
        'reports', 'users',
        ['reporter_id'], ['id'],
        ondelete='SET NULL'
    )

    # =========================================================
    # 5. Fix reports.assigned_to FK: RESTRICT -> SET NULL
    # =========================================================
    op.drop_constraint(
        'reports_assigned_to_fkey',
        'reports',
        type_='foreignkey'
    )
    op.create_foreign_key(
        'reports_assigned_to_fkey',
        'reports', 'users',
        ['assigned_to'], ['id'],
        ondelete='SET NULL'
    )

    # =========================================================
    # 6. Fix deployment_logs.deployed_by_id FK: RESTRICT -> SET NULL
    # =========================================================
    op.drop_constraint(
        'deployment_logs_deployed_by_id_fkey',
        'deployment_logs',
        type_='foreignkey'
    )
    op.alter_column('deployment_logs', 'deployed_by_id', nullable=True)
    op.create_foreign_key(
        'deployment_logs_deployed_by_id_fkey',
        'deployment_logs', 'users',
        ['deployed_by_id'], ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    # =========================================================
    # Reverse lifecycle columns
    # =========================================================
    op.drop_index('ix_users_is_deleted', table_name='users')
    op.drop_index('ix_users_deleted_at', table_name='users')
    op.drop_column('users', 'restored_by')
    op.drop_column('users', 'restored_at')
    op.drop_column('users', 'deleted_by')
    op.drop_column('users', 'deleted_at')

    # =========================================================
    # Reverse FK fixes — restore original RESTRICT behavior
    # =========================================================
    op.drop_constraint('notifications_user_id_fkey', 'notifications', type_='foreignkey')
    op.alter_column('notifications', 'user_id', nullable=False)
    op.create_foreign_key('notifications_user_id_fkey', 'notifications', 'users', ['user_id'], ['id'])

    op.drop_constraint('user_notification_settings_user_id_fkey', 'user_notification_settings', type_='foreignkey')
    op.create_foreign_key('user_notification_settings_user_id_fkey', 'user_notification_settings', 'users', ['user_id'], ['id'])

    op.drop_constraint('reports_reporter_id_fkey', 'reports', type_='foreignkey')
    op.alter_column('reports', 'reporter_id', nullable=False)
    op.create_foreign_key('reports_reporter_id_fkey', 'reports', 'users', ['reporter_id'], ['id'])

    op.drop_constraint('reports_assigned_to_fkey', 'reports', type_='foreignkey')
    op.create_foreign_key('reports_assigned_to_fkey', 'reports', 'users', ['assigned_to'], ['id'])

    op.drop_constraint('deployment_logs_deployed_by_id_fkey', 'deployment_logs', type_='foreignkey')
    op.alter_column('deployment_logs', 'deployed_by_id', nullable=False)
    op.create_foreign_key('deployment_logs_deployed_by_id_fkey', 'deployment_logs', 'users', ['deployed_by_id'], ['id'])
