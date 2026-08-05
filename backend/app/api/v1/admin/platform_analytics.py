from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
import io
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from datetime import datetime, timezone, timedelta
import psutil

from app.dependencies.database import get_db
from app.dependencies.auth import require_permission
from app.models.user import User
from app.models.project import Project
from app.models.feedback import Feedback
from app.models.system_error import SystemError
from app.models.audit_log import AuditLog
from app.models.workspace import File
from app.models.execution_log import ExecutionLog
from app.schemas.responses import SuccessResponse


from .schemas import *

router = APIRouter()


def _get_table_counts(db: Session) -> dict:
    """Return row counts for major tables in ONE SQL round trip.

    Before: 7 separate COUNT(*) queries (7 round trips).
    After:  1 subselect query (1 round trip).
    """
    row = db.execute(
        text("""
        SELECT
            (SELECT COUNT(*) FROM users         WHERE is_deleted = false) AS users,
            (SELECT COUNT(*) FROM projects)                                AS projects,
            (SELECT COUNT(*) FROM files)                                   AS files,
            (SELECT COUNT(*) FROM execution_logs)                          AS execution_logs,
            (SELECT COUNT(*) FROM feedback)                                AS feedback,
            (SELECT COUNT(*) FROM system_errors)                           AS system_errors,
            (SELECT COUNT(*) FROM audit_logs)                              AS audit_logs
    """)
    ).fetchone()
    return {
        "users": row.users,
        "projects": row.projects,
        "files": row.files,
        "execution_logs": row.execution_logs,
        "feedback": row.feedback,
        "system_errors": row.system_errors,
        "audit_logs": row.audit_logs,
    }


# --- Platform Analytics Center ---


@router.get("/analytics/compiler/charts", response_model=SuccessResponse)
def get_compiler_analytics_charts(
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("system.storage.view")),
):
    from app.models.execution_log import ExecutionLog

    # 1. Runtime Trend (Average execution_time_ms per day for last 30 days)
    since = datetime.now(timezone.utc) - timedelta(days=30)
    runtime_trend_rows = (
        db.query(
            func.date(ExecutionLog.created_at).label("date"),
            func.avg(ExecutionLog.execution_time_ms).label("avg_runtime"),
        )
        .filter(
            ExecutionLog.created_at >= since, ExecutionLog.execution_time_ms.isnot(None)
        )
        .group_by(func.date(ExecutionLog.created_at))
        .order_by(func.date(ExecutionLog.created_at))
        .all()
    )
    runtime_trend = [
        {"date": str(r.date), "runtime": round(r.avg_runtime or 0)}
        for r in runtime_trend_rows
    ]

    # 2. Runtime Distribution (<1s, 1-5s, >5s) — ONE query using CASE WHEN (was 3 queries)
    from sqlalchemy import case as sa_case

    dist_row = (
        db.query(
            func.count(sa_case((ExecutionLog.execution_time_ms < 1000, 1))).label(
                "under_1s"
            ),
            func.count(
                sa_case(
                    (
                        (ExecutionLog.execution_time_ms >= 1000)
                        & (ExecutionLog.execution_time_ms <= 5000),
                        1,
                    )
                )
            ).label("one_to_5s"),
            func.count(sa_case((ExecutionLog.execution_time_ms > 5000, 1))).label(
                "over_5s"
            ),
        )
        .filter(ExecutionLog.execution_time_ms.isnot(None))
        .one()
    )
    runtime_dist = [
        {"bucket": "< 1s", "count": dist_row.under_1s},
        {"bucket": "1s - 5s", "count": dist_row.one_to_5s},
        {"bucket": "> 5s", "count": dist_row.over_5s},
    ]

    # 3. Top Users
    top_users_rows = (
        db.query(User.username, func.count(ExecutionLog.id).label("count"))
        .join(ExecutionLog, ExecutionLog.user_id == User.id)
        .group_by(User.username)
        .order_by(func.count(ExecutionLog.id).desc())
        .limit(10)
        .all()
    )
    top_users = [{"user": r.username, "count": r.count} for r in top_users_rows]

    # 4. Top Projects
    top_projects_rows = (
        db.query(Project.name, func.count(ExecutionLog.id).label("count"))
        .join(ExecutionLog, ExecutionLog.project_id == Project.id)
        .group_by(Project.name)
        .order_by(func.count(ExecutionLog.id).desc())
        .limit(10)
        .all()
    )
    top_projects = [{"project": r.name, "count": r.count} for r in top_projects_rows]

    data = {
        "runtime_trend": runtime_trend,
        "runtime_distribution": runtime_dist,
        "top_users": top_users,
        "top_projects": top_projects,
    }
    return SuccessResponse(message="Compiler charts retrieved", data=data)


@router.get("/analytics/storage/dashboard", response_model=SuccessResponse)
def get_storage_dashboard(
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("system.storage.view")),
):
    from app.models.workspace import File, FileVersion

    total_file_size = db.query(func.sum(File.size)).scalar() or 0
    total_versions_size = db.query(func.sum(FileVersion.size)).scalar() or 0

    used_storage = total_file_size + total_versions_size

    # Real database size via PostgreSQL system function
    try:
        db_size_row = db.execute(
            text("SELECT pg_database_size(current_database())")
        ).fetchone()
        db_size = db_size_row[0] if db_size_row else None
    except Exception:
        db_size = None

    # Real disk capacity from the host via psutil
    try:
        disk = psutil.disk_usage("/")
        total_capacity = disk.total
    except Exception:
        total_capacity = None

    # No log rotation tracking system exists — do not fabricate a value
    logs_storage = None
    # No backup system is integrated — do not fabricate a value
    backups_storage = None

    data = {
        "used_storage_bytes": used_storage,
        "total_storage_bytes": total_capacity,
        "available_storage_bytes": (total_capacity - used_storage)
        if total_capacity is not None
        else None,
        "database_size_bytes": db_size,
        "object_storage_bytes": used_storage,
        "logs_storage_bytes": logs_storage,
        "backups_storage_bytes": backups_storage,
    }
    return SuccessResponse(message="Storage dashboard retrieved", data=data)


@router.get("/analytics/storage/charts", response_model=SuccessResponse)
def get_storage_charts(
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("system.storage.view")),
):
    from app.models.workspace import File

    since = datetime.now(timezone.utc) - timedelta(days=30)
    growth_rows = (
        db.query(
            func.date(File.created_at).label("date"),
            func.sum(File.size).label("daily_bytes"),
        )
        .filter(File.created_at >= since)
        .group_by(func.date(File.created_at))
        .order_by(func.date(File.created_at))
        .all()
    )

    growth_trend = []
    cumulative = 0
    for r in growth_rows:
        cumulative += r.daily_bytes or 0
        growth_trend.append({"date": str(r.date), "bytes": cumulative})

    type_rows = (
        db.query(File.extension, func.sum(File.size).label("total_bytes"))
        .filter(File.extension.isnot(None))
        .group_by(File.extension)
        .order_by(func.sum(File.size).desc())
        .limit(10)
        .all()
    )

    storage_by_type = [
        {"type": r.extension or "unknown", "bytes": r.total_bytes or 0}
        for r in type_rows
    ]

    return SuccessResponse(
        message="Storage charts retrieved",
        data={"growth_trend": growth_trend, "storage_by_type": storage_by_type},
    )


@router.get("/analytics/storage/largest-projects", response_model=SuccessResponse)
def get_storage_largest_projects(
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("system.storage.view")),
):
    from app.models.workspace import File

    rows = (
        db.query(
            Project.name,
            User.username,
            func.sum(File.size).label("total_size"),
            func.count(File.id).label("file_count"),
            func.max(File.updated_at).label("last_updated"),
        )
        .join(Project, File.project_id == Project.id)
        .outerjoin(User, Project.owner_id == User.id)
        .group_by(Project.name, User.username)
        .order_by(func.sum(File.size).desc())
        .limit(50)
        .all()
    )

    items = []
    for r in rows:
        items.append(
            {
                "project": r.name,
                "owner": r.username or "System",
                "size_bytes": r.total_size or 0,
                "files": r.file_count,
                "last_updated": r.last_updated,
            }
        )
    return SuccessResponse(message="Largest projects retrieved", data={"items": items})


@router.get("/analytics/storage/largest-users", response_model=SuccessResponse)
def get_storage_largest_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("system.storage.view")),
):
    from app.models.workspace import File

    rows = (
        db.query(
            User.username,
            func.count(func.distinct(Project.id)).label("project_count"),
            func.sum(File.size).label("total_size"),
            func.count(File.id).label("file_count"),
        )
        .join(Project, Project.owner_id == User.id)
        .join(File, File.project_id == Project.id)
        .group_by(User.username)
        .order_by(func.sum(File.size).desc())
        .limit(50)
        .all()
    )

    items = []
    for r in rows:
        items.append(
            {
                "user": r.username,
                "projects": r.project_count,
                "storage_bytes": r.total_size or 0,
                "uploads": r.file_count,
                "downloads": None,  # No download tracking system — not fabricated
            }
        )
    return SuccessResponse(message="Largest users retrieved", data={"items": items})


@router.get("/analytics/export")
def export_analytics(
    type: str = "compiler",
    format: str = "json",
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("system.storage.view")),
):
    import json

    if type == "compiler":
        data = {
            "module": "Compiler Analytics",
            "export_date": datetime.now(timezone.utc).isoformat(),
        }
    elif type == "storage":
        data = {
            "module": "Storage Analytics",
            "export_date": datetime.now(timezone.utc).isoformat(),
        }
    else:
        raise HTTPException(status_code=400, detail="Invalid export type")

    if format == "json":
        return StreamingResponse(
            io.BytesIO(json.dumps(data, indent=2).encode("utf-8")),
            media_type="application/json",
            headers={
                "Content-Disposition": f'attachment; filename="analytics_{type}.json"'
            },
        )
    else:
        csv_data = f"module,export_date\n{data['module']},{data['export_date']}"
        return StreamingResponse(
            io.BytesIO(csv_data.encode("utf-8")),
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="analytics_{type}.csv"'
            },
        )


@router.get("/database", response_model=SuccessResponse)
def get_database_info(
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("database.backup")),
):
    """Returns database size and table statistics."""
    try:
        # PostgreSQL database size
        db_size_result = db.execute(
            text(
                "SELECT pg_size_pretty(pg_database_size(current_database())) as size, pg_database_size(current_database()) as size_bytes"
            )
        ).fetchone()

        # Additional metrics
        try:
            db_version_res = db.execute(text("SELECT version()")).fetchone()
            db_version = db_version_res[0] if db_version_res else "Unknown"

            # Simple active connection count
            active_conn_res = db.execute(
                text("SELECT count(*) FROM pg_stat_activity")
            ).fetchone()
            active_connections = active_conn_res[0] if active_conn_res else 1

            # Check real connection pool status via pg_stat_activity
            try:
                active_conn_res = db.execute(
                    text("SELECT count(*) FROM pg_stat_activity WHERE state = 'active'")
                ).fetchone()
                max_conn_res = db.execute(
                    text(
                        "SELECT setting::int FROM pg_settings WHERE name = 'max_connections'"
                    )
                ).fetchone()
                active_count = active_conn_res[0] if active_conn_res else 0
                max_count = max_conn_res[0] if max_conn_res else 100
                if active_count / max(max_count, 1) > 0.9:
                    pool_status = "Warning"
                else:
                    pool_status = "Healthy"
            except Exception:
                pool_status = "Unknown"

            # Migration status cannot be safely queried at runtime without running alembic CLI
            migration_status = "Unavailable"
        except:
            db_version = "Unknown"
            active_connections = 1
            pool_status = "Unknown"
            migration_status = "Unknown"

        table_counts = _get_table_counts(db)

        return SuccessResponse(
            message="Database info retrieved",
            data={
                "db_size": db_size_result.size if db_size_result else "Unknown",
                "db_size_bytes": db_size_result.size_bytes if db_size_result else 0,
                "db_version": db_version,
                "active_connections": active_connections,
                "pool_status": pool_status,
                "migration_status": migration_status,
                "table_counts": table_counts,
            },
        )
    except Exception as e:
        # Fallback if DB size query fails
        from app.core.logger import logger

        logger.error(f"Failed to fetch DB size: {e}", exc_info=True)
        table_counts = {
            "users": db.query(User).filter(User.is_deleted == False).count(),
            "projects": db.query(Project).count(),
            "files": db.query(File).count(),
            "execution_logs": db.query(ExecutionLog).count(),
            "feedback": db.query(Feedback).count(),
            "system_errors": db.query(SystemError).count(),
            "audit_logs": db.query(AuditLog).count(),
        }
        return SuccessResponse(
            message="Database info retrieved",
            data={
                "db_size": "N/A",
                "db_size_bytes": 0,
                "table_counts": table_counts,
            },
        )
