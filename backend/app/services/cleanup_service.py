"""
Enterprise Cleanup Service

Scheduled cleanup jobs that run as background tasks to keep the database
lean and free of expired/orphaned data.

Each job is idempotent — safe to run multiple times.
Each job logs what it cleaned up at INFO level.

Runs every 6 hours via the lifespan background task in main.py.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session
from sqlalchemy import delete, and_

from app.dependencies.database import SessionLocal
from app.models.user_session import UserSession
from app.models.guest_session import GuestSession
from app.models.notification import Notification
from app.models.execution_log import ExecutionLog, ExecutionStatus

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Individual cleanup jobs
# ---------------------------------------------------------------------------

def purge_expired_sessions(db: Session) -> int:
    """Delete user_sessions that have passed their expires_at timestamp."""
    now = datetime.now(timezone.utc)
    result = db.execute(
        delete(UserSession).where(
            and_(UserSession.expires_at < now, UserSession.is_active == False)
        )
    )
    db.commit()
    count = result.rowcount
    if count:
        logger.info(f"[Cleanup] Purged {count} expired user sessions")
    return count


def purge_expired_guest_sessions(db: Session) -> int:
    """Delete guest_sessions that have passed their expires_at timestamp."""
    now = datetime.now(timezone.utc)
    result = db.execute(
        delete(GuestSession).where(GuestSession.expires_at < now)
    )
    db.commit()
    count = result.rowcount
    if count:
        logger.info(f"[Cleanup] Purged {count} expired guest sessions")
    return count


def purge_orphaned_notifications(db: Session, days: int = 90) -> int:
    """
    Delete notifications that:
      - Have a NULL user_id (user was deleted, FK SET NULL)
      - Are older than `days` days
    These are anonymized records with no owner — safe to remove.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    result = db.execute(
        delete(Notification).where(
            and_(Notification.user_id.is_(None), Notification.created_at < cutoff)
        )
    )
    db.commit()
    count = result.rowcount
    if count:
        logger.info(f"[Cleanup] Purged {count} orphaned notifications older than {days} days")
    return count


def purge_old_completed_executions(db: Session, days: int = 30) -> int:
    """
    Delete execution logs older than `days` days that have a terminal status.
    Active/queued/running executions are never touched.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    terminal_statuses = [
        ExecutionStatus.SUCCESS,
        ExecutionStatus.CANCELLED,
        ExecutionStatus.TIMEOUT,
        ExecutionStatus.COMPILE_ERROR,
        ExecutionStatus.RUNTIME_ERROR,
        ExecutionStatus.SYSTEM_ERROR,
    ]
    result = db.execute(
        delete(ExecutionLog).where(
            and_(
                ExecutionLog.status.in_(terminal_statuses),
                ExecutionLog.created_at < cutoff,
                ExecutionLog.project_id.is_(None),  # Guest executions only — keep project-associated logs
            )
        )
    )
    db.commit()
    count = result.rowcount
    if count:
        logger.info(f"[Cleanup] Purged {count} old guest execution logs older than {days} days")
    return count


# ---------------------------------------------------------------------------
# Master cleanup runner
# ---------------------------------------------------------------------------

def run_all_cleanup_jobs() -> dict:
    """
    Run all cleanup jobs in a single DB session.
    Returns a summary dict suitable for logging.
    """
    db = SessionLocal()
    summary = {}
    try:
        summary["expired_sessions"] = purge_expired_sessions(db)
        summary["expired_guest_sessions"] = purge_expired_guest_sessions(db)
        summary["orphaned_notifications"] = purge_orphaned_notifications(db)
        summary["old_guest_executions"] = purge_old_completed_executions(db)
        logger.info(f"[Cleanup] Completed all jobs: {summary}")
    except Exception as exc:
        logger.error(f"[Cleanup] Error during cleanup jobs: {exc}", exc_info=True)
        db.rollback()
    finally:
        db.close()
    return summary


# ---------------------------------------------------------------------------
# Async background loop (used by main.py lifespan)
# ---------------------------------------------------------------------------

async def cleanup_loop(interval_seconds: int = 21600) -> None:
    """
    Runs cleanup jobs in an async background loop.
    Default interval: 21600 seconds = 6 hours.
    Starts with a 60-second delay on application startup to avoid
    running during initial migration/seeding.
    """
    await asyncio.sleep(60)  # Initial delay
    while True:
        try:
            logger.info("[Cleanup] Starting scheduled database cleanup...")
            run_all_cleanup_jobs()
        except Exception as exc:
            logger.error(f"[Cleanup] Unhandled error in cleanup loop: {exc}", exc_info=True)
        await asyncio.sleep(interval_seconds)
