"""Add missing columns v2

Revision ID: 4ce741faa3ea
Revises: b27d424d95a8
Create Date: 2026-07-24 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '4ce741faa3ea'
down_revision: Union[str, Sequence[str], None] = 'b27d424d95a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('api_keys',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('key_hash', sa.String(length=255), nullable=False),
    sa.Column('key_prefix', sa.String(length=10), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=True),
    sa.Column('scopes', sa.String(length=500), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('backup_logs',
    sa.Column('id', sa.String(length=32), nullable=False),
    sa.Column('filename', sa.String(length=255), nullable=False),
    sa.Column('size_bytes', sa.Integer(), nullable=True),
    sa.Column('status', sa.String(length=50), nullable=True),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('feature_flags',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('description', sa.String(length=500), nullable=True),
    sa.Column('is_enabled', sa.Boolean(), nullable=True),
    sa.Column('environment', sa.String(length=50), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('name')
    )
    op.create_table('permissions',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('node', sa.String(length=100), nullable=False),
    sa.Column('description', sa.String(length=500), nullable=True),
    sa.Column('category', sa.String(length=100), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_permissions_node'), 'permissions', ['node'], unique=True)
    op.create_table('secrets',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('value_encrypted', sa.Text(), nullable=False),
    sa.Column('description', sa.String(length=500), nullable=True),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('name')
    )
    op.create_table('admin_audit_logs',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('actor_id', sa.Uuid(), nullable=False),
    sa.Column('action', sa.String(length=100), nullable=False),
    sa.Column('target_id', sa.String(length=100), nullable=True),
    sa.Column('target_type', sa.String(length=100), nullable=True),
    sa.Column('details', sa.JSON(), nullable=True),
    sa.Column('ip_address', sa.String(length=45), nullable=True),
    sa.Column('user_agent', sa.String(length=500), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_admin_audit_logs_action'), 'admin_audit_logs', ['action'], unique=False)
    op.create_index(op.f('ix_admin_audit_logs_actor_id'), 'admin_audit_logs', ['actor_id'], unique=False)
    op.create_index(op.f('ix_admin_audit_logs_created_at'), 'admin_audit_logs', ['created_at'], unique=False)
    op.create_index(op.f('ix_admin_audit_logs_target_id'), 'admin_audit_logs', ['target_id'], unique=False)
    op.create_table('blocked_ips',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('ip_address', sa.String(length=45), nullable=False),
    sa.Column('reason', sa.String(length=500), nullable=True),
    sa.Column('blocked_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['blocked_by_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_blocked_ips_ip_address'), 'blocked_ips', ['ip_address'], unique=False)
    op.create_table('deployment_logs',
    sa.Column('id', sa.String(length=32), nullable=False),
    sa.Column('version', sa.String(length=50), nullable=True),
    sa.Column('release_notes', sa.String(), nullable=True),
    sa.Column('status', sa.String(), nullable=True),
    sa.Column('deployed_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('deployed_by_id', sa.Uuid(), nullable=True),
    sa.ForeignKeyConstraint(['deployed_by_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('notifications',
    sa.Column('id', sa.String(length=32), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('type', sa.Enum('SYSTEM', 'SECURITY', 'MAINTENANCE', 'QUEUE', 'EXECUTION', 'BROADCAST', name='notificationtype'), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('message', sa.Text(), nullable=False),
    sa.Column('is_read', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('reports',
    sa.Column('id', sa.String(length=32), nullable=False),
    sa.Column('reporter_id', sa.Uuid(), nullable=False),
    sa.Column('target_type', sa.Enum('USER', 'PROJECT', name='reporttargettype'), nullable=False),
    sa.Column('target_id', sa.String(length=32), nullable=False),
    sa.Column('reason', sa.Text(), nullable=False),
    sa.Column('status', sa.Enum('PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', name='reportstatus'), nullable=False),
    sa.Column('assigned_to', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['assigned_to'], ['users.id'], ),
    sa.ForeignKeyConstraint(['reporter_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('role_permissions',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('role', postgresql.ENUM('USER', 'MODERATOR', 'ADMIN', 'OWNER', name='roleenum', create_type=False), nullable=False),
    sa.Column('permission_id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_role_permissions_permission_id'), 'role_permissions', ['permission_id'], unique=False)
    op.create_index(op.f('ix_role_permissions_role'), 'role_permissions', ['role'], unique=False)
    op.create_table('user_notification_settings',
    sa.Column('id', sa.String(length=32), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('email_alerts', sa.Boolean(), nullable=True),
    sa.Column('system_alerts', sa.Boolean(), nullable=True),
    sa.Column('security_alerts', sa.Boolean(), nullable=True),
    sa.Column('marketing_emails', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id')
    )
    # Add new columns to execution_logs
    op.add_column('execution_logs', sa.Column('compiler', sa.String(length=100), nullable=True))
    op.add_column('execution_logs', sa.Column('cpu_usage', sa.String(length=50), nullable=True))
    op.add_column('execution_logs', sa.Column('memory_usage', sa.String(length=50), nullable=True))
    op.add_column('execution_logs', sa.Column('container_id', sa.String(length=100), nullable=True))
    op.add_column('execution_logs', sa.Column('worker_node', sa.String(length=100), nullable=True))
    op.add_column('execution_logs', sa.Column('queue_position', sa.Integer(), nullable=True))
    op.add_column('execution_logs', sa.Column('exit_code', sa.Integer(), nullable=True))
    op.add_column('execution_logs', sa.Column('start_time', sa.DateTime(timezone=True), nullable=True))
    op.add_column('execution_logs', sa.Column('end_time', sa.DateTime(timezone=True), nullable=True))
    op.add_column('execution_logs', sa.Column('env_vars', sa.String(length=1000), nullable=True))
    op.add_column('execution_logs', sa.Column('logs', sa.Text(), nullable=True))
    op.add_column('execution_logs', sa.Column('error_output', sa.Text(), nullable=True))
    # Add new columns to system_settings
    op.add_column('system_settings', sa.Column('app_name', sa.String(), server_default='Hamara Editor', nullable=False))
    op.add_column('system_settings', sa.Column('default_timezone', sa.String(), server_default='UTC', nullable=False))
    op.add_column('system_settings', sa.Column('queue_limits', sa.Integer(), server_default='1000', nullable=False))
    op.add_column('system_settings', sa.Column('worker_limits', sa.Integer(), server_default='10', nullable=False))
    op.add_column('system_settings', sa.Column('retention_days', sa.Integer(), server_default='30', nullable=False))
    op.add_column('system_settings', sa.Column('oauth_google_enabled', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('system_settings', sa.Column('oauth_google_client_id', sa.String(), nullable=True))
    op.add_column('system_settings', sa.Column('oauth_google_client_secret', sa.String(), nullable=True))
    op.add_column('system_settings', sa.Column('oauth_github_enabled', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('system_settings', sa.Column('oauth_github_client_id', sa.String(), nullable=True))
    op.add_column('system_settings', sa.Column('oauth_github_client_secret', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('system_settings', 'oauth_github_client_secret')
    op.drop_column('system_settings', 'oauth_github_client_id')
    op.drop_column('system_settings', 'oauth_github_enabled')
    op.drop_column('system_settings', 'oauth_google_client_secret')
    op.drop_column('system_settings', 'oauth_google_client_id')
    op.drop_column('system_settings', 'oauth_google_enabled')
    op.drop_column('system_settings', 'retention_days')
    op.drop_column('system_settings', 'worker_limits')
    op.drop_column('system_settings', 'queue_limits')
    op.drop_column('system_settings', 'default_timezone')
    op.drop_column('system_settings', 'app_name')
    op.drop_column('execution_logs', 'error_output')
    op.drop_column('execution_logs', 'logs')
    op.drop_column('execution_logs', 'env_vars')
    op.drop_column('execution_logs', 'end_time')
    op.drop_column('execution_logs', 'start_time')
    op.drop_column('execution_logs', 'exit_code')
    op.drop_column('execution_logs', 'queue_position')
    op.drop_column('execution_logs', 'worker_node')
    op.drop_column('execution_logs', 'container_id')
    op.drop_column('execution_logs', 'memory_usage')
    op.drop_column('execution_logs', 'cpu_usage')
    op.drop_column('execution_logs', 'compiler')
    op.drop_table('user_notification_settings')
    op.drop_index(op.f('ix_role_permissions_role'), table_name='role_permissions')
    op.drop_index(op.f('ix_role_permissions_permission_id'), table_name='role_permissions')
    op.drop_table('role_permissions')
    op.drop_table('reports')
    op.drop_table('notifications')
    op.drop_table('deployment_logs')
    op.drop_index(op.f('ix_blocked_ips_ip_address'), table_name='blocked_ips')
    op.drop_table('blocked_ips')
    op.drop_index(op.f('ix_admin_audit_logs_target_id'), table_name='admin_audit_logs')
    op.drop_index(op.f('ix_admin_audit_logs_created_at'), table_name='admin_audit_logs')
    op.drop_index(op.f('ix_admin_audit_logs_actor_id'), table_name='admin_audit_logs')
    op.drop_index(op.f('ix_admin_audit_logs_action'), table_name='admin_audit_logs')
    op.drop_table('admin_audit_logs')
    op.drop_table('secrets')
    op.drop_index(op.f('ix_permissions_node'), table_name='permissions')
    op.drop_table('permissions')
    op.drop_table('feature_flags')
    op.drop_table('backup_logs')
    op.drop_table('api_keys')
