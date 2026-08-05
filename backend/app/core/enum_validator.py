"""
Startup Enum Validator

Compares Python enum values against the live PostgreSQL enum type values.
Called once during application startup (via FastAPI lifespan).

Behaviour:
  - On PostgreSQL: queries pg_enum and pg_type, logs differences at CRITICAL
    level, and raises RuntimeError to fail startup immediately.
  - On SQLite / other dialects: logs a DEBUG skip message and returns.

This prevents the class of production bug where a Python enum gains a new
value that is never propagated to PostgreSQL via a migration.

Usage (in main.py lifespan):
    from app.core.enum_validator import validate_db_enums
    validate_db_enums(db)
"""

from __future__ import annotations

import logging
from sqlalchemy.orm import Session
from sqlalchemy import text

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Registry: Python enum class -> PostgreSQL type name
# Add new enum mappings here as the schema grows.
# ---------------------------------------------------------------------------
_ENUM_REGISTRY: dict[str, str] = {
    "ExecutionStatus": "executionstatus",
    # Example for future enums:
    # "RoleEnum": "roleenum",
}


def _get_pg_enum_values(db: Session, pg_type_name: str) -> set[str]:
    """Query pg_enum for the current values of a named PostgreSQL enum type."""
    result = db.execute(
        text(
            """
            SELECT e.enumlabel
            FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = :type_name
            ORDER BY e.enumsortorder
            """
        ),
        {"type_name": pg_type_name},
    )
    return {row[0] for row in result.fetchall()}


def validate_db_enums(db: Session) -> None:
    """
    Validate that every Python enum value exists in its corresponding
    PostgreSQL enum type. Raises RuntimeError if any mismatch is found.

    Call this once at application startup, before serving traffic.
    """
    dialect_name = db.bind.dialect.name if db.bind else "unknown"

    if dialect_name != "postgresql":
        logger.debug(
            f"[EnumValidator] Skipping enum validation on dialect '{dialect_name}' "
            f"(PostgreSQL-only check)."
        )
        return

    # Import here to avoid circular imports at module level
    from app.models.execution_log import ExecutionStatus

    python_enum_map: dict[str, type] = {
        "ExecutionStatus": ExecutionStatus,
    }

    mismatches: list[str] = []

    for enum_class_name, pg_type_name in _ENUM_REGISTRY.items():
        python_enum = python_enum_map.get(enum_class_name)
        if python_enum is None:
            logger.warning(
                f"[EnumValidator] Enum class '{enum_class_name}' not found in "
                f"python_enum_map — skipping."
            )
            continue

        python_values: set[str] = {member.value for member in python_enum}

        try:
            pg_values = _get_pg_enum_values(db, pg_type_name)
        except Exception as exc:
            logger.error(
                f"[EnumValidator] Failed to query PostgreSQL enum '{pg_type_name}': {exc}",
                exc_info=True,
            )
            mismatches.append(
                f"  [{pg_type_name}] Could not query PostgreSQL enum: {exc}"
            )
            continue

        if not pg_values:
            mismatches.append(
                f"  [{pg_type_name}] PostgreSQL enum not found — was the migration run?"
            )
            continue

        missing_in_pg = python_values - pg_values
        missing_in_python = pg_values - python_values  # informational only

        if missing_in_pg:
            mismatches.append(
                f"  [{pg_type_name}] Values present in Python but MISSING from PostgreSQL: "
                f"{sorted(missing_in_pg)}. "
                f"Run: alembic upgrade head"
            )

        if missing_in_python:
            # This is unusual but not fatal — log a warning only
            logger.warning(
                f"[EnumValidator] [{pg_type_name}] Values present in PostgreSQL but NOT in "
                f"Python enum: {sorted(missing_in_python)}. "
                f"This may indicate a Python enum was shrunk without a migration."
            )

        if not missing_in_pg:
            logger.info(
                f"[EnumValidator] OK: '{pg_type_name}' — "
                f"PostgreSQL has {sorted(pg_values)}, "
                f"Python has {sorted(python_values)}"
            )

    if mismatches:
        error_msg = (
            "\n[EnumValidator] FATAL: PostgreSQL enum mismatch detected at startup.\n"
            + "\n".join(mismatches)
            + "\n\nApplication startup aborted to prevent data corruption. "
            "Run `alembic upgrade head` and restart the application.\n"
        )
        logger.critical(error_msg)
        raise RuntimeError(error_msg)
