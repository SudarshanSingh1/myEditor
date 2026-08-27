"""Email Template Studio — add email_templates table

Revision ID: t001_email_template_studio
Revises: p001_performance_indexes
Create Date: 2026-08-27

Changes:
1. Creates EmailTemplateType PostgreSQL ENUM
2. Creates email_templates table with full schema
3. Adds composite index on (template_type, is_active) for fast fallback lookup
4. Additive only — zero existing data touched.
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


# revision identifiers
revision = "t001_email_template_studio"
down_revision = "p001_performance_indexes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_tables = inspector.get_table_names()

    if "email_templates" in existing_tables:
        # Idempotent: table already exists (e.g. dev environment), skip creation
        return

    # Create the ENUM type first (PostgreSQL requires it to exist before the table)
    email_template_type = sa.Enum(
        "VERIFICATION",
        "PASSWORD_RESET",
        "WELCOME",
        "LOGIN_ALERT",
        "CUSTOM",
        "BROADCAST",
        "SMTP_TEST",
        name="emailtemplatetype",
    )
    email_template_type.create(conn, checkfirst=True)

    op.create_table(
        "email_templates",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        # Identity
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column(
            "template_type",
            sa.Enum(
                "VERIFICATION",
                "PASSWORD_RESET",
                "WELCOME",
                "LOGIN_ALERT",
                "CUSTOM",
                "BROADCAST",
                "SMTP_TEST",
                name="emailtemplatetype",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("description", sa.Text(), nullable=True),
        # Content
        sa.Column("subject_template", sa.String(255), nullable=False),
        sa.Column("html_content", sa.Text(), nullable=False),
        sa.Column("text_content", sa.Text(), nullable=True),
        # JSON fields
        sa.Column("design_config", sa.JSON(), nullable=True),
        sa.Column("variables", sa.JSON(), nullable=True),
        # State flags
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "is_default",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        # Audit FK columns
        sa.Column(
            "created_by",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "updated_by",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        # Timestamps
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    # Individual indexes
    op.create_index(
        "ix_email_templates_slug",
        "email_templates",
        ["slug"],
        unique=True,
    )
    op.create_index(
        "ix_email_templates_template_type",
        "email_templates",
        ["template_type"],
        unique=False,
    )
    op.create_index(
        "ix_email_templates_is_active",
        "email_templates",
        ["is_active"],
        unique=False,
    )
    # Composite: the primary query pattern — find active template by type
    op.create_index(
        "ix_email_templates_type_active",
        "email_templates",
        ["template_type", "is_active"],
        unique=False,
    )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_tables = inspector.get_table_names()

    if "email_templates" not in existing_tables:
        return

    # Drop indexes first
    for idx in [
        "ix_email_templates_type_active",
        "ix_email_templates_is_active",
        "ix_email_templates_template_type",
        "ix_email_templates_slug",
    ]:
        op.drop_index(idx, table_name="email_templates")

    op.drop_table("email_templates")

    # Drop the ENUM type last
    sa.Enum(name="emailtemplatetype").drop(conn, checkfirst=True)
