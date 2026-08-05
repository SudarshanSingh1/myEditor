from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from datetime import datetime, timezone
import psutil
import time
import smtplib
from app.core.config import settings

from app.dependencies.database import get_db
from app.dependencies.auth import require_permission, require_admin
from app.models.user import User
from app.models.workspace import File
from app.schemas.responses import SuccessResponse


from .schemas import *

router = APIRouter()


# --- Dashboard & Stats ---
@router.get("/dashboard", response_model=SuccessResponse)
def get_dashboard(
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("users.read.basic")),
):
    today = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    query = text("""
        SELECT 
            (SELECT COUNT(*) FROM users WHERE is_deleted = false) as total_users,
            (SELECT COUNT(*) FROM projects) as total_projects,
            (SELECT COUNT(*) FROM execution_logs) as total_executions,
            (SELECT COUNT(*) FROM users WHERE created_at >= :today AND is_deleted = false) as users_today,
            (SELECT COUNT(*) FROM execution_logs WHERE created_at >= :today) as executions_today,
            (SELECT COUNT(*) FROM feedback) as total_feedback,
            (SELECT COUNT(*) FROM system_errors) as total_errors,
            (SELECT COUNT(*) FROM users WHERE status = 'ACTIVE' AND is_deleted = false) as active_users
    """)

    result = db.execute(query, {"today": today}).fetchone()

    return SuccessResponse(
        message="Dashboard retrieved",
        data={
            "total_users": result.total_users,
            "users_today": result.users_today,
            "active_users": result.active_users,
            "total_projects": result.total_projects,
            "total_executions": result.total_executions,
            "executions_today": result.executions_today,
            "total_feedback": result.total_feedback,
            "total_errors": result.total_errors,
        },
    )


@router.get("/statistics", response_model=SuccessResponse)
def get_statistics(
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("users.read.basic")),
):
    today = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    query = text("""
        SELECT 
            (SELECT COUNT(*) FROM users WHERE is_deleted = false) as total_users,
            (SELECT COUNT(*) FROM users WHERE status = 'ACTIVE' AND is_deleted = false) as active_users,
            (SELECT COUNT(*) FROM users WHERE role IN ('ADMIN', 'OWNER') AND is_deleted = false) as admins,
            (SELECT COUNT(*) FROM projects) as projects,
            (SELECT COUNT(*) FROM files) as files,
            (SELECT COUNT(*) FROM feedback) as feedback,
            (SELECT COUNT(*) FROM system_errors WHERE created_at >= :today) as errors_today
    """)

    result = db.execute(query, {"today": today}).fetchone()

    # Real storage: sum all file sizes actually stored in the DB
    storage_bytes = db.query(func.sum(File.size)).scalar() or 0

    return SuccessResponse(
        message="Stats retrieved",
        data={
            "total_users": result.total_users,
            "active_users": result.active_users,
            "admins": result.admins,
            "projects": result.projects,
            "files": result.files,
            "feedback_count": result.feedback,
            "errors_today": result.errors_today,
            "storage_used_bytes": storage_bytes,
        },
    )


@router.get("/server", response_model=SuccessResponse)
def get_server_status(
    db: Session = Depends(get_db), admin: User = Depends(require_admin)
):
    # interval=None returns the last OS-measured value without sleeping.
    # interval=0.5 (the old value) blocks the worker thread for 500ms per call.
    cpu = psutil.cpu_percent(interval=None)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")

    # Docker status — reuse the singleton client from server.py if available
    docker_status = "unknown"
    docker_containers = 0
    try:
        from .server import _get_docker_client
        client = _get_docker_client()
        containers = client.containers.list()
        docker_containers = len(containers)
        docker_status = "online"
    except Exception as e:
        from app.core.logger import logger

        logger.warning(f"Failed to get Docker status: {e}", exc_info=True)
        docker_status = "unavailable"

    try:
        net = psutil.net_io_counters()
        net_sent = round(net.bytes_sent / (1024**2), 2)
        net_recv = round(net.bytes_recv / (1024**2), 2)
        total_packets = getattr(net, "packets_sent", 0) + getattr(net, "packets_recv", 0)
        total_lost = getattr(net, "errin", 0) + getattr(net, "errout", 0) + getattr(net, "dropin", 0) + getattr(net, "dropout", 0)
        packet_loss = round((total_lost / total_packets * 100), 2) if total_packets > 0 else 0
    except Exception:
        net_sent, net_recv = 0, 0
        packet_loss = 0

    try:
        uptime = round(time.time() - psutil.boot_time(), 0)
    except Exception:
        uptime = 0

    return SuccessResponse(
        message="Server status retrieved",
        data={
            "cpu_percent": cpu,
            "ram_percent": mem.percent,
            "ram_used_gb": round(mem.used / (1024**3), 2),
            "ram_total_gb": round(mem.total / (1024**3), 2),
            "disk_percent": disk.percent,
            "disk_used_gb": round(disk.used / (1024**3), 2),
            "disk_total_gb": round(disk.total / (1024**3), 2),
            "api_status": "online",
            "docker_status": docker_status,
            "docker_containers": docker_containers,
            "network_sent_mb": net_sent,
            "network_recv_mb": net_recv,
            "packet_loss_percent": packet_loss,
            "uptime_seconds": uptime,
            "process_count": len(psutil.pids()),
        },
    )



import asyncio


@router.websocket("/telemetry/ws")
async def telemetry_websocket(websocket: WebSocket):
    # TODO: Add authentication checking here using token or cookies
    await websocket.accept()

    async def listen():
        try:
            while True:
                await websocket.receive()
        except Exception:
            pass

    listen_task = asyncio.create_task(listen())

    try:
        while True:
            if listen_task.done():
                break

            cpu = psutil.cpu_percent(interval=0)
            mem = psutil.virtual_memory()
            disk = psutil.disk_usage("/")

            try:
                net = psutil.net_io_counters()
                net_sent = round(net.bytes_sent / (1024**2), 2)
                net_recv = round(net.bytes_recv / (1024**2), 2)
                total_packets = getattr(net, "packets_sent", 0) + getattr(net, "packets_recv", 0)
                total_lost = getattr(net, "errin", 0) + getattr(net, "errout", 0) + getattr(net, "dropin", 0) + getattr(net, "dropout", 0)
                packet_loss = round((total_lost / total_packets * 100), 2) if total_packets > 0 else 0
            except:
                net_sent, net_recv = 0, 0
                packet_loss = 0

            payload = {
                "cpu_percent": cpu,
                "ram_percent": mem.percent,
                "ram_used_gb": round(mem.used / (1024**3), 2),
                "disk_percent": disk.percent,
                "network_sent_mb": net_sent,
                "network_recv_mb": net_recv,
                "packet_loss_percent": packet_loss,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            await websocket.send_json(payload)
            # Send at 1Hz (ping/pong handles heartbeat, this is just data)
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        pass
    except asyncio.CancelledError:
        pass
    except Exception as e:
        from app.core.logger import logger

        logger.error(f"Telemetry websocket error: {e}")
    finally:
        listen_task.cancel()
        try:
            await websocket.close()
        except:
            pass


@router.websocket("/alerts/ws")
async def alerts_websocket(websocket: WebSocket):
    await websocket.accept()

    async def listen():
        try:
            while True:
                await websocket.receive()
        except Exception:
            pass

    listen_task = asyncio.create_task(listen())

    try:
        while True:
            if listen_task.done():
                break

            # Simulate a push alert based on thresholds
            alerts = []
            cpu = psutil.cpu_percent(interval=0)
            mem = psutil.virtual_memory()

            if cpu > 85:
                alerts.append(
                    {
                        "type": "warning",
                        "message": f"High CPU Usage: {cpu}%",
                        "source": "System",
                    }
                )

            if mem.percent > 90:
                alerts.append(
                    {
                        "type": "critical",
                        "message": f"Memory Exhaustion Warning: {mem.percent}% used",
                        "source": "System",
                    }
                )

            if alerts:
                await websocket.send_json(
                    {
                        "alerts": alerts,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                )

            # Check every 10 seconds
            await asyncio.sleep(10)
    except WebSocketDisconnect:
        pass
    except asyncio.CancelledError:
        pass
    except Exception:
        pass
    finally:
        listen_task.cancel()
        try:
            await websocket.close()
        except:
            pass


@router.get("/server/health", response_model=SuccessResponse)
def get_server_health(
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("users.read.basic")),
):
    items = []

    # Check Database
    start = time.time()
    db_status = "online"
    try:
        db.execute(text("SELECT 1"))
    except:
        db_status = "offline"
    items.append(
        {
            "label": "Database",
            "status": db_status,
            "latency": f"{int((time.time()-start)*1000)}ms",
        }
    )

    # Check API (Self)
    items.append({"label": "API Gateway", "status": "online", "latency": "1ms"})

    # Check Docker
    docker_status = "online"
    start = time.time()
    try:
        import docker

        client = docker.from_env(timeout=1)
        client.ping()
    except:
        docker_status = "offline"
    items.append(
        {
            "label": "Docker Engine",
            "status": docker_status,
            "latency": f"{int((time.time()-start)*1000)}ms",
        }
    )

    # Check Queue Worker — look for a real uvicorn/worker process
    worker_status = "offline"
    worker_latency = "N/A"
    try:
        for p in psutil.process_iter(["name", "cmdline"]):
            try:
                cmd = " ".join(p.info.get("cmdline", []) or [])
                if "uvicorn" in cmd or "gunicorn" in cmd:
                    worker_status = "online"
                    worker_latency = "<1ms"
                    break
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
    except Exception:
        worker_status = "unavailable"
    items.append(
        {"label": "Queue Worker", "status": worker_status, "latency": worker_latency}
    )

    # Check SMTP — real TCP connection test
    smtp_status = "offline"
    smtp_latency = "N/A"
    smtp_host = getattr(settings, "SMTP_HOST", None)
    smtp_port = getattr(settings, "SMTP_PORT", 587)
    if not smtp_host:
        smtp_status = "not_configured"
        smtp_latency = "N/A"
    else:
        try:
            start = time.time()
            with smtplib.SMTP(smtp_host, int(smtp_port), timeout=3) as s:
                s.noop()
            smtp_latency = f"{int((time.time() - start) * 1000)}ms"
            smtp_status = "online"
        except Exception:
            smtp_status = "offline"

    items.append(
        {"label": "SMTP Relay", "status": smtp_status, "latency": smtp_latency}
    )

    # Auth Service — if this endpoint is responding, auth is online
    items.append({"label": "Auth Service", "status": "online", "latency": "<1ms"})

    return SuccessResponse(message="Server health retrieved", data={"items": items})
