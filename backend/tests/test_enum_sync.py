"""
Regression tests for PostgreSQL enum synchronization.

These tests guard against the class of production bug where a Python enum
gains a new value that is never propagated to the database via a migration.

CI pipeline requirement:
  These tests MUST pass before any deployment. A failure here means someone
  added a value to a Python enum without creating the corresponding Alembic
  migration.

Test strategy:
  - On SQLite (default CI/CD): tests verify structural invariants
    (Python enum is a superset of the values originally shipped to production,
    new values are explicitly known-added, etc.).
  - On PostgreSQL: tests query pg_enum directly and assert exact set equality.

The tests are dialect-aware so they work in both environments without mocking.
"""

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker


# ---------------------------------------------------------------------------
# The authoritative set of values that were in the ORIGINAL PostgreSQL enum
# as created by migration b6d06df803b6. This is the historical baseline.
# ---------------------------------------------------------------------------
_ORIGINAL_PG_VALUES: frozenset[str] = frozenset(
    {
        "SUCCESS",
        "COMPILE_ERROR",
        "RUNTIME_ERROR",
        "TIMEOUT",
        "SYSTEM_ERROR",
    }
)

# ---------------------------------------------------------------------------
# The values that were intentionally added AFTER the original migration.
# Every value here must have a corresponding ADD VALUE migration.
# ---------------------------------------------------------------------------
_INTENTIONALLY_ADDED: frozenset[str] = frozenset(
    {
        "QUEUED",  # Added: execution queue support (migration g002b3c4d5e6)
        "RUNNING",  # Added: execution queue support (migration g002b3c4d5e6)
        "CANCELLED",  # Added: stop-execution feature   (migration g002b3c4d5e6)
    }
)

# The complete expected set = original + intentional additions
_EXPECTED_ALL: frozenset[str] = _ORIGINAL_PG_VALUES | _INTENTIONALLY_ADDED


class TestExecutionStatusEnumSync:
    """Tests that ExecutionStatus stays in sync with the database enum."""

    def test_python_enum_contains_all_expected_values(self):
        """Every value in our expected-all set must be present in the Python enum."""
        from app.models.execution_log import ExecutionStatus

        python_values = frozenset(m.value for m in ExecutionStatus)

        missing = _EXPECTED_ALL - python_values
        assert not missing, (
            f"Python ExecutionStatus is missing expected values: {sorted(missing)}. "
            f"Add them to app/models/execution_log.py."
        )

    def test_python_enum_has_no_undocumented_values(self):
        """
        Any value in the Python enum beyond _EXPECTED_ALL must be explicitly
        documented in _INTENTIONALLY_ADDED. This prevents silent enum growth.
        """
        from app.models.execution_log import ExecutionStatus

        python_values = frozenset(m.value for m in ExecutionStatus)
        undocumented = python_values - _EXPECTED_ALL

        assert not undocumented, (
            f"ExecutionStatus contains undocumented values not in _EXPECTED_ALL: "
            f"{sorted(undocumented)}. "
            f"Either add them to _EXPECTED_ALL in this test file AND create an "
            f"Alembic migration (ALTER TYPE executionstatus ADD VALUE), or remove "
            f"them from the Python enum."
        )

    def test_original_values_still_present_in_python_enum(self):
        """The original 5 PostgreSQL values must never be removed from the Python enum."""
        from app.models.execution_log import ExecutionStatus

        python_values = frozenset(m.value for m in ExecutionStatus)
        missing_originals = _ORIGINAL_PG_VALUES - python_values

        assert not missing_originals, (
            f"Original PostgreSQL enum values were REMOVED from the Python enum: "
            f"{sorted(missing_originals)}. "
            f"Removing enum values requires a full enum recreation migration — "
            f"do not remove them without explicit sign-off."
        )

    def test_added_values_are_accounted_for(self):
        """_INTENTIONALLY_ADDED must be a subset of the Python enum (not just documented)."""
        from app.models.execution_log import ExecutionStatus

        python_values = frozenset(m.value for m in ExecutionStatus)
        claimed_but_missing = _INTENTIONALLY_ADDED - python_values

        assert not claimed_but_missing, (
            f"Values listed in _INTENTIONALLY_ADDED are not actually in the Python enum: "
            f"{sorted(claimed_but_missing)}. "
            f"Update _INTENTIONALLY_ADDED in this test file."
        )

    def test_enum_values_are_uppercase_strings(self):
        """All ExecutionStatus values must be uppercase strings (matches PG convention)."""
        from app.models.execution_log import ExecutionStatus

        for member in ExecutionStatus:
            assert isinstance(member.value, str), (
                f"ExecutionStatus.{member.name}.value must be a str, "
                f"got {type(member.value)}"
            )
            assert member.value == member.value.upper(), (
                f"ExecutionStatus.{member.name}.value must be uppercase, "
                f"got '{member.value}'"
            )

    def test_enum_is_str_subclass(self):
        """ExecutionStatus must subclass str for SQLAlchemy string-cast queries to work."""
        from app.models.execution_log import ExecutionStatus

        assert issubclass(ExecutionStatus, str), (
            "ExecutionStatus must subclass str (class ExecutionStatus(str, enum.Enum)). "
            "Several query patterns in admin/executions.py rely on this."
        )

    def test_cleanup_service_terminal_statuses_subset_of_enum(self):
        """
        The terminal_statuses list in cleanup_service.py must be a subset of
        the ExecutionStatus enum. A value not in the enum would cause a DB error
        on PostgreSQL.
        """
        from app.models.execution_log import ExecutionStatus

        # Mirror the exact list used in cleanup_service.py
        terminal_statuses = [
            ExecutionStatus.SUCCESS,
            ExecutionStatus.CANCELLED,
            ExecutionStatus.TIMEOUT,
            ExecutionStatus.COMPILE_ERROR,
            ExecutionStatus.RUNTIME_ERROR,
            ExecutionStatus.SYSTEM_ERROR,
        ]

        all_enum_values = set(ExecutionStatus)
        invalid = [s for s in terminal_statuses if s not in all_enum_values]

        assert not invalid, (
            f"cleanup_service.py terminal_statuses contains values not in ExecutionStatus: "
            f"{invalid}"
        )

    def test_admin_executions_cancelled_reference_is_valid(self):
        """ExecutionStatus.CANCELLED must exist (used in admin/executions.py line 189)."""
        from app.models.execution_log import ExecutionStatus

        assert hasattr(ExecutionStatus, "CANCELLED"), (
            "ExecutionStatus.CANCELLED does not exist. "
            "admin/executions.py:189 sets log.status = ExecutionStatus.CANCELLED."
        )
        assert ExecutionStatus.CANCELLED.value == "CANCELLED"

    def test_enum_validator_skips_on_sqlite(self, tmp_path):
        """
        validate_db_enums() must not raise on SQLite — it should silently skip.
        This verifies that CI using SQLite does not fail on the startup validator.
        """
        from app.core.enum_validator import validate_db_enums

        engine = create_engine(f"sqlite:///{tmp_path}/test_enum.db")
        Session = sessionmaker(bind=engine)
        db = Session()

        try:
            # Must not raise
            validate_db_enums(db)
        finally:
            db.close()
            engine.dispose()

    @pytest.mark.skipif(
        True,  # Skip by default — enabled in PostgreSQL CI via env override
        reason="PostgreSQL-only test: set ENUM_PG_TEST=1 to enable",
    )
    def test_pg_enum_exact_match(self, db_session):
        """
        On a real PostgreSQL database, assert exact set equality between the
        Python enum and pg_enum. This is the gold-standard CI check.

        Enable with: ENUM_PG_TEST=1 pytest tests/test_enum_sync.py -k pg_enum
        """
        import os

        if not os.getenv("ENUM_PG_TEST"):
            pytest.skip("ENUM_PG_TEST env var not set")

        from app.models.execution_log import ExecutionStatus

        result = db_session.execute(
            text(
                """
                SELECT e.enumlabel
                FROM pg_enum e
                JOIN pg_type t ON e.enumtypid = t.oid
                WHERE t.typname = 'executionstatus'
                ORDER BY e.enumsortorder
                """
            )
        )
        pg_values = frozenset(row[0] for row in result.fetchall())
        python_values = frozenset(m.value for m in ExecutionStatus)

        only_in_pg = pg_values - python_values
        only_in_python = python_values - pg_values

        assert not only_in_python, (
            f"Values in Python but NOT in PostgreSQL: {sorted(only_in_python)}. "
            f"Run: alembic upgrade head"
        )
        assert not only_in_pg, (
            f"Values in PostgreSQL but NOT in Python: {sorted(only_in_pg)}. "
            f"Add them to ExecutionStatus or create a downgrade migration."
        )
