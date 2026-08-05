"""Add missing columns v2

Revision ID: 4ce741faa3ea
Revises: b27d424d95a8
Create Date: 2026-07-24 15:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "4ce741faa3ea"
down_revision: Union[str, Sequence[str], None] = "b27d424d95a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add new columns to execution_logs
    op.add_column(
        "execution_logs", sa.Column("compiler", sa.String(length=100), nullable=True)
    )
    op.add_column(
        "execution_logs", sa.Column("cpu_usage", sa.String(length=50), nullable=True)
    )
    op.add_column(
        "execution_logs", sa.Column("memory_usage", sa.String(length=50), nullable=True)
    )
    op.add_column(
        "execution_logs",
        sa.Column("container_id", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "execution_logs", sa.Column("worker_node", sa.String(length=100), nullable=True)
    )
    op.add_column(
        "execution_logs", sa.Column("queue_position", sa.Integer(), nullable=True)
    )
    op.add_column("execution_logs", sa.Column("exit_code", sa.Integer(), nullable=True))
    op.add_column(
        "execution_logs",
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "execution_logs",
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "execution_logs", sa.Column("env_vars", sa.String(length=1000), nullable=True)
    )
    op.add_column("execution_logs", sa.Column("logs", sa.Text(), nullable=True))
    op.add_column("execution_logs", sa.Column("error_output", sa.Text(), nullable=True))
    # Add new columns to system_settings
    op.add_column(
        "system_settings",
        sa.Column(
            "app_name", sa.String(), server_default="Hamara Editor", nullable=False
        ),
    )
    op.add_column(
        "system_settings",
        sa.Column(
            "default_timezone", sa.String(), server_default="UTC", nullable=False
        ),
    )
    op.add_column(
        "system_settings",
        sa.Column("queue_limits", sa.Integer(), server_default="1000", nullable=False),
    )
    op.add_column(
        "system_settings",
        sa.Column("worker_limits", sa.Integer(), server_default="10", nullable=False),
    )
    op.add_column(
        "system_settings",
        sa.Column("retention_days", sa.Integer(), server_default="30", nullable=False),
    )
    op.add_column(
        "system_settings",
        sa.Column(
            "oauth_google_enabled", sa.Boolean(), server_default="false", nullable=False
        ),
    )
    op.add_column(
        "system_settings",
        sa.Column("oauth_google_client_id", sa.String(), nullable=True),
    )
    op.add_column(
        "system_settings",
        sa.Column("oauth_google_client_secret", sa.String(), nullable=True),
    )
    op.add_column(
        "system_settings",
        sa.Column(
            "oauth_github_enabled", sa.Boolean(), server_default="false", nullable=False
        ),
    )
    op.add_column(
        "system_settings",
        sa.Column("oauth_github_client_id", sa.String(), nullable=True),
    )
    op.add_column(
        "system_settings",
        sa.Column("oauth_github_client_secret", sa.String(), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("system_settings", "oauth_github_client_secret")
    op.drop_column("system_settings", "oauth_github_client_id")
    op.drop_column("system_settings", "oauth_github_enabled")
    op.drop_column("system_settings", "oauth_google_client_secret")
    op.drop_column("system_settings", "oauth_google_client_id")
    op.drop_column("system_settings", "oauth_google_enabled")
    op.drop_column("system_settings", "retention_days")
    op.drop_column("system_settings", "worker_limits")
    op.drop_column("system_settings", "queue_limits")
    op.drop_column("system_settings", "default_timezone")
    op.drop_column("system_settings", "app_name")
    op.drop_column("execution_logs", "error_output")
    op.drop_column("execution_logs", "logs")
    op.drop_column("execution_logs", "env_vars")
    op.drop_column("execution_logs", "end_time")
    op.drop_column("execution_logs", "start_time")
    op.drop_column("execution_logs", "exit_code")
    op.drop_column("execution_logs", "queue_position")
    op.drop_column("execution_logs", "worker_node")
    op.drop_column("execution_logs", "container_id")
    op.drop_column("execution_logs", "memory_usage")
    op.drop_column("execution_logs", "cpu_usage")
    op.drop_column("execution_logs", "compiler")
