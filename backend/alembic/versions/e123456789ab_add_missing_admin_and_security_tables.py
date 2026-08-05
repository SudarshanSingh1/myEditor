"""add missing admin and security tables

Revision ID: e123456789ab
Revises: 4ce741faa3ea
Create Date: 2026-07-25 15:50:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision: str = "e123456789ab"
down_revision: Union[str, Sequence[str], None] = "4ce741faa3ea"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_tables = inspector.get_table_names()

    if "blocked_ips" not in existing_tables:
        op.create_table(
            "blocked_ips",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("ip_address", sa.String(length=45), nullable=False),
            sa.Column("reason", sa.String(length=255), nullable=True),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_by_id", sa.Uuid(), nullable=True),
            sa.ForeignKeyConstraint(
                ["created_by_id"], ["users.id"], ondelete="SET NULL"
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("ip_address"),
        )
        op.create_index(
            op.f("ix_blocked_ips_ip_address"),
            "blocked_ips",
            ["ip_address"],
            unique=True,
        )

    reporttargettype = postgresql.ENUM("USER", "PROJECT", name="reporttargettype")
    reporttargettype.create(op.get_bind(), checkfirst=True)
    reportstatus = postgresql.ENUM(
        "PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED", name="reportstatus"
    )
    reportstatus.create(op.get_bind(), checkfirst=True)

    if "reports" not in existing_tables:
        op.create_table(
            "reports",
            sa.Column("id", sa.String(length=32), nullable=False),
            sa.Column("reporter_id", sa.Uuid(), nullable=False),
            sa.Column(
                "target_type",
                postgresql.ENUM(
                    "USER", "PROJECT", name="reporttargettype", create_type=False
                ),
                nullable=False,
            ),
            sa.Column("target_id", sa.String(length=32), nullable=False),
            sa.Column("reason", sa.Text(), nullable=False),
            sa.Column(
                "status",
                postgresql.ENUM(
                    "PENDING",
                    "IN_PROGRESS",
                    "RESOLVED",
                    "REJECTED",
                    name="reportstatus",
                    create_type=False,
                ),
                nullable=False,
            ),
            sa.Column("assigned_to", sa.Uuid(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(
                ["assigned_to"],
                ["users.id"],
            ),
            sa.ForeignKeyConstraint(
                ["reporter_id"],
                ["users.id"],
            ),
            sa.PrimaryKeyConstraint("id"),
        )

    notificationtype = postgresql.ENUM(
        "SYSTEM",
        "SECURITY",
        "MAINTENANCE",
        "QUEUE",
        "EXECUTION",
        "BROADCAST",
        name="notificationtype",
    )
    notificationtype.create(op.get_bind(), checkfirst=True)

    if "notifications" not in existing_tables:
        op.create_table(
            "notifications",
            sa.Column("id", sa.String(length=32), nullable=False),
            sa.Column("user_id", sa.Uuid(), nullable=False),
            sa.Column(
                "type",
                postgresql.ENUM(
                    "SYSTEM",
                    "SECURITY",
                    "MAINTENANCE",
                    "QUEUE",
                    "EXECUTION",
                    "BROADCAST",
                    name="notificationtype",
                    create_type=False,
                ),
                nullable=False,
            ),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("is_read", sa.Boolean(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(
                ["user_id"],
                ["users.id"],
            ),
            sa.PrimaryKeyConstraint("id"),
        )

    if "user_notification_settings" not in existing_tables:
        op.create_table(
            "user_notification_settings",
            sa.Column("id", sa.String(length=32), nullable=False),
            sa.Column("user_id", sa.Uuid(), nullable=False),
            sa.Column("email_alerts", sa.Boolean(), nullable=True),
            sa.Column("system_alerts", sa.Boolean(), nullable=True),
            sa.Column("security_alerts", sa.Boolean(), nullable=True),
            sa.Column("marketing_emails", sa.Boolean(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(
                ["user_id"],
                ["users.id"],
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id"),
        )

    if "api_keys" not in existing_tables:
        op.create_table(
            "api_keys",
            sa.Column("id", sa.String(length=32), nullable=False),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("key_hash", sa.String(length=255), nullable=False),
            sa.Column("prefix", sa.String(length=32), nullable=False),
            sa.Column("scopes", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("key_hash"),
        )

    if "secrets" not in existing_tables:
        op.create_table(
            "secrets",
            sa.Column("id", sa.String(length=32), nullable=False),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("category", sa.String(length=100), nullable=True),
            sa.Column("encrypted_value", sa.String(), nullable=False),
            sa.Column("masked_value", sa.String(length=255), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("name"),
        )

    if "feature_flags" not in existing_tables:
        op.create_table(
            "feature_flags",
            sa.Column("id", sa.String(length=32), nullable=False),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("key", sa.String(length=255), nullable=False),
            sa.Column("description", sa.String(length=500), nullable=True),
            sa.Column("enabled", sa.Boolean(), nullable=False),
            sa.Column("environment", sa.String(length=100), nullable=False),
            sa.Column("rollout_percentage", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("key"),
        )

    if "backup_logs" not in existing_tables:
        op.create_table(
            "backup_logs",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("filename", sa.String(), nullable=False),
            sa.Column("size_bytes", sa.Integer(), nullable=True),
            sa.Column("status", sa.String(), nullable=True),
            sa.Column("type", sa.String(), nullable=True),
            sa.Column("metadata_json", sa.JSON(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=True,
            ),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )

    if "deployment_logs" not in existing_tables:
        op.create_table(
            "deployment_logs",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("version", sa.String(), nullable=False),
            sa.Column("build_number", sa.String(), nullable=False),
            sa.Column("environment", sa.String(), nullable=False),
            sa.Column("release_notes", sa.String(), nullable=True),
            sa.Column("status", sa.String(), nullable=True),
            sa.Column(
                "deployed_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=True,
            ),
            sa.Column("deployed_by_id", sa.Uuid(), nullable=True),
            sa.ForeignKeyConstraint(
                ["deployed_by_id"],
                ["users.id"],
            ),
            sa.PrimaryKeyConstraint("id"),
        )


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_tables = inspector.get_table_names()

    if "deployment_logs" in existing_tables:
        op.drop_table("deployment_logs")
    if "backup_logs" in existing_tables:
        op.drop_table("backup_logs")
    if "feature_flags" in existing_tables:
        op.drop_table("feature_flags")
    if "secrets" in existing_tables:
        op.drop_table("secrets")
    if "api_keys" in existing_tables:
        op.drop_table("api_keys")
    if "user_notification_settings" in existing_tables:
        op.drop_table("user_notification_settings")
    if "notifications" in existing_tables:
        op.drop_table("notifications")
    if "reports" in existing_tables:
        op.drop_table("reports")
    if "blocked_ips" in existing_tables:
        op.drop_index(op.f("ix_blocked_ips_ip_address"), table_name="blocked_ips")
        op.drop_table("blocked_ips")

    notificationtype = postgresql.ENUM(
        "SYSTEM",
        "SECURITY",
        "MAINTENANCE",
        "QUEUE",
        "EXECUTION",
        "BROADCAST",
        name="notificationtype",
    )
    notificationtype.drop(op.get_bind(), checkfirst=True)
    reportstatus = postgresql.ENUM(
        "PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED", name="reportstatus"
    )
    reportstatus.drop(op.get_bind(), checkfirst=True)
    reporttargettype = postgresql.ENUM("USER", "PROJECT", name="reporttargettype")
    reporttargettype.drop(op.get_bind(), checkfirst=True)
