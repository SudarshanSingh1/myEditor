from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
import time

from app.dependencies.database import get_db
from app.dependencies.auth import require_permission
from app.models.user import User
from app.schemas.responses import SuccessResponse
from app.services.audit_service import AuditService


from .schemas import *

router = APIRouter()


# ---------------------------------------------------------------------------
# Module-level Docker client singleton.
# Creating docker.from_env() on every request opens a new Unix socket.
# A single shared client is safe for concurrent reads.
# ---------------------------------------------------------------------------
_docker_client = None
_docker_client_lock = threading.Lock()


def _get_docker_client():
    global _docker_client
    if _docker_client is not None:
        return _docker_client
    with _docker_client_lock:
        if _docker_client is None:
            import docker
            _docker_client = docker.from_env(timeout=3)
    return _docker_client


# ---------------------------------------------------------------------------
# Workers cache — avoids hitting Docker on every 5-second frontend poll.
# TTL is 4 seconds: fresh enough for live telemetry, never stale for ops.
# ---------------------------------------------------------------------------
_workers_cache: dict = {"items": None, "ts": 0.0}
_WORKERS_TTL = 4.0  # seconds


def _fetch_container_stats(c) -> dict:
    """
    Fetch Docker stats for a single container.  Called from a thread pool so
    all containers are queried in parallel instead of sequentially.

    stats(stream=False) waits for the Docker daemon to return ONE reading.
    On Linux this is near-instant because cgroups already have the counters.
    The ~1 s delay in the old code was caused by calling this serially — the
    SDK internally samples twice 1 s apart when you use the high-level
    .stats() helper without stream.  We skip that by reading cpu_stats and
    precpu_stats from a single snapshot.
    """
    try:
        stats = c.stats(stream=False)

        # CPU %
        cpu_delta = (
            stats["cpu_stats"]["cpu_usage"]["total_usage"]
            - stats["precpu_stats"]["cpu_usage"]["total_usage"]
        )
        system_delta = stats["cpu_stats"].get("system_cpu_usage", 0) - stats[
            "precpu_stats"
        ].get("system_cpu_usage", 0)
        num_cpus = stats["cpu_stats"].get("online_cpus") or len(
            stats["cpu_stats"]["cpu_usage"].get("percpu_usage", [1])
        )
        cpu_percent = (
            round((cpu_delta / system_delta) * num_cpus * 100.0, 1)
            if system_delta > 0
            else 0.0
        )

        # Memory % — subtract page cache (cgroups v1)
        mem_usage = stats["memory_stats"].get("usage", 0)
        mem_limit = stats["memory_stats"].get("limit", 1)
        cache = stats["memory_stats"].get("stats", {}).get("cache", 0)
        mem_used = max(mem_usage - cache, 0)
        mem_percent = (
            round((mem_used / mem_limit) * 100.0, 1) if mem_limit > 0 else 0.0
        )

        return {
            "id": c.short_id,
            "hostname": c.name,
            "status": "online" if c.status == "running" else "offline",
            "cpu_percent": cpu_percent,
            "memory_percent": mem_percent,
            "active_executions": 0,
            "last_heartbeat": datetime.now(timezone.utc).isoformat(),
        }
    except Exception:
        # Stats failed for this container — include it with zeroes.
        return {
            "id": c.short_id,
            "hostname": c.name,
            "status": "online" if c.status == "running" else "offline",
            "cpu_percent": 0.0,
            "memory_percent": 0.0,
            "active_executions": 0,
            "last_heartbeat": datetime.now(timezone.utc).isoformat(),
        }


# 3. Infra Monitoring Additions
@router.get("/server/workers", response_model=SuccessResponse)
def get_workers(
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("system.containers.restart")),
):
    # Serve from cache when fresh enough (avoids Docker hit on every 5s poll)
    now = time.monotonic()
    cached = _workers_cache
    if cached["items"] is not None and (now - cached["ts"]) < _WORKERS_TTL:
        return SuccessResponse(message="Workers retrieved", data={"items": cached["items"]})

    items = []

    # Try Docker — fetch stats for ALL containers in parallel
    try:
        client = _get_docker_client()
        containers = client.containers.list()

        if containers:
            # ThreadPoolExecutor with one thread per container; max 16 threads.
            # Each thread blocks on stats(stream=False) independently so total
            # wall time ≈ slowest single container instead of sum of all.
            with ThreadPoolExecutor(max_workers=min(len(containers), 16)) as pool:
                futures = {pool.submit(_fetch_container_stats, c): c for c in containers}
                for future in as_completed(futures, timeout=5):
                    try:
                        items.append(future.result())
                    except Exception:
                        pass
    except Exception:
        pass

    # Fallback: psutil process scan (no Docker)
    if not items:
        import psutil
        for p in psutil.process_iter(
            ["pid", "name", "cmdline", "cpu_percent", "memory_percent"]
        ):
            try:
                cmd = " ".join(p.info.get("cmdline", []) or [])
                if "uvicorn" in cmd or "python" in cmd:
                    if "backend/main:app" in cmd or "scripts/" in cmd:
                        items.append(
                            {
                                "id": str(p.info["pid"]),
                                "hostname": f"Process {p.info['pid']} ({p.info['name']})",
                                "status": "online",
                                "cpu_percent": round(p.info["cpu_percent"] or 0, 1),
                                "memory_percent": round(
                                    p.info["memory_percent"] or 0, 1
                                ),
                                "active_executions": 0,
                                "last_heartbeat": datetime.now(
                                    timezone.utc
                                ).isoformat(),
                            }
                        )
            except Exception:
                pass

    if not items:
        items = [
            {
                "id": "worker-1",
                "hostname": "local-worker",
                "status": "online",
                "cpu_percent": 0.0,
                "memory_percent": 0.0,
                "active_executions": 0,
                "last_heartbeat": datetime.now(timezone.utc).isoformat(),
            }
        ]

    # Write through to cache
    _workers_cache["items"] = items
    _workers_cache["ts"] = now

    return SuccessResponse(message="Workers retrieved", data={"items": items})



@router.post("/server/workers/{worker_id}/restart", response_model=SuccessResponse)
def restart_worker(
    worker_id: str,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("system.maintenance.toggle")),
):
    AuditService.log_action(
        db,
        admin.id,
        "RESTART_WORKER",
        request.client.host,
        request.headers.get("user-agent"),
        {"worker": worker_id},
    )

    # Attempt real Docker container restart
    try:
        import docker

        client = docker.from_env(timeout=5)
        containers = client.containers.list(all=True)

        target = None
        for c in containers:
            if c.short_id == worker_id or c.name == worker_id or c.id == worker_id:
                target = c
                break

        if target is None:
            raise HTTPException(
                status_code=404,
                detail=f"Container '{worker_id}' not found. Use Docker CLI to restart manually.",
            )

        target.restart(timeout=10)
        return SuccessResponse(
            message=f"Container '{target.name}' restarted successfully."
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Docker restart failed: {str(e)}. Restart '{worker_id}' manually via Docker CLI.",
        )
