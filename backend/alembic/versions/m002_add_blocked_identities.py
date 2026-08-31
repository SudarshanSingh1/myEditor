"""add blocked_identities table

Revision ID: m002_add_blocked_identities
Revises: m001_merge_github_email_heads
Create Date: 2026-08-31

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'm002_add_blocked_identities'
down_revision: Union[str, Sequence[str], None] = 'm001_merge_github_email_heads'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the Enum type first
    block_reason_enum = postgresql.ENUM('PERMANENT_DELETE', 'BANNED', name='blockreason')
    block_reason_enum.create(op.get_bind())

    op.create_table(
        'blocked_identities',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('provider_id', sa.String(length=255), nullable=False),
        sa.Column('original_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('reason', postgresql.ENUM('PERMANENT_DELETE', 'BANNED', name='blockreason', create_type=False), nullable=False),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('blocked_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_blocked_identities_id'), 'blocked_identities', ['id'], unique=False)
    op.create_index(op.f('ix_blocked_identities_provider'), 'blocked_identities', ['provider'], unique=False)
    op.create_index(op.f('ix_blocked_identities_provider_id'), 'blocked_identities', ['provider_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_blocked_identities_provider_id'), table_name='blocked_identities')
    op.drop_index(op.f('ix_blocked_identities_provider'), table_name='blocked_identities')
    op.drop_index(op.f('ix_blocked_identities_id'), table_name='blocked_identities')
    op.drop_table('blocked_identities')
    
    # Drop the Enum type
    block_reason_enum = postgresql.ENUM('PERMANENT_DELETE', 'BANNED', name='blockreason')
    block_reason_enum.drop(op.get_bind())

