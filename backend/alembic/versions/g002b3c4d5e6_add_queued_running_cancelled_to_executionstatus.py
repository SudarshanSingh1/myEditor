"""add QUEUED, RUNNING, CANCELLED to executionstatus enum

Revision ID: g002b3c4d5e6
Revises: f001a2b3c4d5
Create Date: 2026-08-04 12:30:00.000000

ROOT CAUSE
----------
The original migration b6d06df803b6 created the PostgreSQL `executionstatus`
enum with only 5 values:
    SUCCESS, COMPILE_ERROR, RUNTIME_ERROR, TIMEOUT, SYSTEM_ERROR

The Python ExecutionStatus enum later gained:
    QUEUED, RUNNING, CANCELLED

These were never propagated to PostgreSQL. Any write of these values
(e.g. setting status = CANCELLED in admin/executions.py) causes a
PostgreSQL DataError, and any IN clause that includes them (e.g.
cleanup_service.py) also fails.

STRATEGY
---------
Use `ALTER TYPE … ADD VALUE IF NOT EXISTS` — the safest method for
PostgreSQL 9.1+, supported by Neon. This is an additive, non-destructive
change. No rows are modified. No indexes are rebuilt.

ORDER MATTERS: New values must be added in a separate transaction from
any DML that uses them on PostgreSQL < 12. On PostgreSQL 12+ (Neon uses
15+), ALTER TYPE … ADD VALUE is safe inside a transaction.

We use `IF NOT EXISTS` to make each ADD VALUE idempotent — running this
migration twice will not error.

ROLLBACK NOTE
-------------
`ALTER TYPE … ADD VALUE` cannot be rolled back in PostgreSQL without
dropping the type (which would require dropping and recreating the column).
The downgrade() is intentionally a no-op. The added values are purely
additive and harmless if unused.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "g002b3c4d5e6"
down_revision: Union[str, None] = "f001a2b3c4d5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# The complete set of values the Python enum declares, in addition to the
# original 5 that already exist in PostgreSQL.
_MISSING_VALUES = ["QUEUED", "RUNNING", "CANCELLED"]


def upgrade() -> None:
    # ---------------------------------------------------------------------------
    # Detect if we are running against SQLite (used in unit tests).
    # SQLite does not have native enum types — SQLAlchemy emits VARCHAR there.
    # The ALTER TYPE statement is PostgreSQL-only; skip it on SQLite.
    # ---------------------------------------------------------------------------
    bind = op.get_bind()
    dialect_name = bind.dialect.name

    if dialect_name == "postgresql":
        # Each ADD VALUE is its own statement to comply with PostgreSQL's
        # restriction on ALTER TYPE inside an explicit transaction prior to v12.
        # Neon runs PostgreSQL 15/16 so this is safe, but we keep them separate
        # to be explicit and clear in pg_catalog.pg_enum audit.
        for value in _MISSING_VALUES:
            # Use raw SQL via op.execute so we can use IF NOT EXISTS cleanly.
            # Alembic's op.sync_enum_values() doesn't support IF NOT EXISTS.
            op.execute(
                sa.text(f"ALTER TYPE executionstatus ADD VALUE IF NOT EXISTS '{value}'")
            )
    else:
        # SQLite / other dialects: enum is stored as VARCHAR, no DDL needed.
        pass


def downgrade() -> None:
    # ---------------------------------------------------------------------------
    # PostgreSQL does not support removing values from an enum type without
    # dropping and recreating it (which would require migrating the column).
    # The added values (QUEUED, RUNNING, CANCELLED) are harmless when unused.
    # A future migration can perform a full enum recreation if removal is needed.
    # ---------------------------------------------------------------------------
    pass
