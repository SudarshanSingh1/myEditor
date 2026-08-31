"""add github fields to oauth_accounts and projects

Revision ID: g001_github_fields
Revises: 7ca384dc5d9d
Create Date: 2026-08-31

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "g001_github_fields"
down_revision: Union[str, Sequence[str], None] = "7ca384dc5d9d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add display fields to oauth_accounts (nullable — no backfill required)
    op.add_column(
        "oauth_accounts",
        sa.Column("github_username", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "oauth_accounts",
        sa.Column("avatar_url", sa.String(length=1024), nullable=True),
    )

    # Add default branch tracking to projects (nullable, app defaults to "main")
    op.add_column(
        "projects",
        sa.Column("github_default_branch", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("oauth_accounts", "github_username")
    op.drop_column("oauth_accounts", "avatar_url")
    op.drop_column("projects", "github_default_branch")
