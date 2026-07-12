"""init

Revision ID: 4113d419cc87
Revises: 
Create Date: 2026-07-11 11:33:30.457996

"""
from typing import Sequence, Union



# revision identifiers, used by Alembic.
revision: str = '4113d419cc87'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
