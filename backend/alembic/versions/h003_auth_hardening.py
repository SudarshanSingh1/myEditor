"""Auth hardening: TOTP replay prevention, refresh token rotation, backup code hashing, pre-delete snapshots

Revision ID: h003_auth_hardening
Revises: g002b3c4d5e6
Create Date: 2026-08-04 18:43:00.000000

CHANGES
-------
1. users.totp_last_used_at        - tracks last TOTP timestamp for replay prevention
2. users.totp_backup_codes        - stores hashed backup codes (replaces plaintext recovery_codes)
3. user_sessions.refresh_token_hash - SHA-256 hash of issued refresh token for rotation
4. user_sessions.country          - geographic session metadata
5. file_versions.is_pre_delete    - flags versions created as pre-deletion snapshots
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "h003_auth_hardening"
down_revision = "g002b3c4d5e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)

    # --- users table ---
    existing_user_cols = {c["name"] for c in inspector.get_columns("users")}

    if "totp_last_used_at" not in existing_user_cols:
        op.add_column(
            "users",
            sa.Column("totp_last_used_at", sa.DateTime(timezone=True), nullable=True),
        )

    if "totp_backup_codes" not in existing_user_cols:
        op.add_column(
            "users",
            sa.Column(
                "totp_backup_codes",
                sa.Text(),
                nullable=True,
                comment="JSON array of SHA-256 hashed backup codes. Plaintext codes are never stored.",
            ),
        )

    # --- user_sessions table ---
    existing_session_cols = {c["name"] for c in inspector.get_columns("user_sessions")}

    if "refresh_token_hash" not in existing_session_cols:
        op.add_column(
            "user_sessions",
            sa.Column(
                "refresh_token_hash",
                sa.String(64),
                nullable=True,
                comment="SHA-256 hash of the currently valid refresh token for this session. Used for rotation replay detection.",
            ),
        )
        op.create_index(
            "ix_user_sessions_refresh_token_hash",
            "user_sessions",
            ["refresh_token_hash"],
            unique=False,
        )

    if "country" not in existing_session_cols:
        op.add_column(
            "user_sessions", sa.Column("country", sa.String(100), nullable=True)
        )

    # --- file_versions table ---
    existing_fv_cols = {c["name"] for c in inspector.get_columns("file_versions")}

    if "is_pre_delete" not in existing_fv_cols:
        op.add_column(
            "file_versions",
            sa.Column(
                "is_pre_delete",
                sa.Boolean(),
                nullable=False,
                server_default="false",
                comment="True when this version was captured as a pre-deletion snapshot for recovery.",
            ),
        )

    if "change_description" not in existing_fv_cols:
        op.add_column(
            "file_versions",
            sa.Column(
                "change_description",
                sa.String(255),
                nullable=True,
                comment="Optional human-readable description of why this version was saved.",
            ),
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)

    existing_user_cols = {c["name"] for c in inspector.get_columns("users")}
    existing_session_cols = {c["name"] for c in inspector.get_columns("user_sessions")}
    existing_fv_cols = {c["name"] for c in inspector.get_columns("file_versions")}

    if "totp_last_used_at" in existing_user_cols:
        op.drop_column("users", "totp_last_used_at")
    if "totp_backup_codes" in existing_user_cols:
        op.drop_column("users", "totp_backup_codes")

    if "refresh_token_hash" in existing_session_cols:
        op.drop_index("ix_user_sessions_refresh_token_hash", table_name="user_sessions")
        op.drop_column("user_sessions", "refresh_token_hash")
    if "country" in existing_session_cols:
        op.drop_column("user_sessions", "country")

    if "is_pre_delete" in existing_fv_cols:
        op.drop_column("file_versions", "is_pre_delete")
    if "change_description" in existing_fv_cols:
        op.drop_column("file_versions", "change_description")
