"""Email Template Studio — add email_templates table

Revision ID: t001_email_template_studio
Revises: p001_performance_indexes
Create Date: 2026-08-27

Changes:
1. Creates EmailTemplateType PostgreSQL ENUM (via postgresql.ENUM, checkfirst=True)
2. Creates email_templates table with full schema
3. Adds composite index on (template_type, is_active) for fast fallback lookup
4. Additive only — zero existing data touched.

FIX NOTE (2026-08-27):
  Original migration used `sa.Enum(..., create_type=False)` inside op.create_table().
  `create_type=False` is ONLY recognized by `sqlalchemy.dialects.postgresql.ENUM`,
  NOT by `sqlalchemy.sa.Enum`. When `sa.Enum` ignores that kwarg, SQLAlchemy's
  PostgreSQL DDL visitor auto-emits a second CREATE TYPE within the same transaction,
  causing `psycopg.errors.DuplicateObject: type "emailtemplatetype" already exists`.
  Fix: use `postgresql.ENUM(..., create_type=False)` throughout, matching the pattern
  already established in every other migration in this project.
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.engine.reflection import Inspector


# revision identifiers
revision = "t001_email_template_studio"
down_revision = "p001_performance_indexes"
branch_labels = None
depends_on = None

# The 7 enum values — defined once, reused in both upgrade and downgrade
_ENUM_VALUES = (
    "VERIFICATION",
    "PASSWORD_RESET",
    "WELCOME",
    "LOGIN_ALERT",
    "CUSTOM",
    "BROADCAST",
    "SMTP_TEST",
)
_ENUM_NAME = "emailtemplatetype"


def upgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_tables = inspector.get_table_names()

    if "email_templates" in existing_tables:
        # Idempotent: table already exists (partial retry), skip entirely
        return

    # ── Step 1: Create the PostgreSQL ENUM type ─────────────────────────────
    # Use postgresql.ENUM (NOT sa.Enum) so that create_type=False is correctly
    # recognised later in op.create_table(). checkfirst=True makes this safe
    # for deployment retries where the type may already exist (e.g. from a
    # prior partial run that crashed after CREATE TYPE but before CREATE TABLE).
    emailtemplatetype = postgresql.ENUM(
        *_ENUM_VALUES,
        name=_ENUM_NAME,
    )
    emailtemplatetype.create(conn, checkfirst=True)

    # ── Step 2: Create the table ─────────────────────────────────────────────
    # Use postgresql.ENUM(..., create_type=False) for the column so SQLAlchemy
    # knows the type already exists and does NOT emit a second CREATE TYPE.
    op.create_table(
        "email_templates",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        # Identity
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column(
            "template_type",
            postgresql.ENUM(
                *_ENUM_VALUES,
                name=_ENUM_NAME,
                create_type=False,  # type already created above
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

    # ── Step 3: Indexes ───────────────────────────────────────────────────────
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
    # Composite: primary query pattern — find active template by type
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

    # Drop the ENUM type last (checkfirst=True for safety)
    postgresql.ENUM(name=_ENUM_NAME).drop(conn, checkfirst=True)
