"""merge github and email templates

Revision ID: m001_merge_github_email_heads
Revises: g001_github_fields, t001_email_template_studio
Create Date: 2026-08-31

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'm001_merge_github_email_heads'
down_revision: Union[str, Sequence[str], None] = ('g001_github_fields', 't001_email_template_studio')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
