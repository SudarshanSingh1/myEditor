from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
import docker

from app.dependencies.database import get_db
from sqlalchemy.orm import Session
from app.models.user import User
from app.dependencies.auth import get_current_user
from app.dependencies.auth import require_permission
from app.services.admin_audit_service import AdminAuditService

router = APIRouter()

def get_docker_client():
    try:
        return docker.from_env()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Cannot connect to Docker daemon")

@router.get("/containers", dependencies=[Depends(require_permission("system.maintenance.view"))])
def list_containers(
    current_user: User = Depends(get_current_user)
):
    client = get_docker_client()
    try:
        containers = client.containers.list(all=True)
        result = []
        for c in containers:
            result.append({
                "id": c.short_id,
                "name": c.name,
                "image": c.image.tags[0] if c.image.tags else c.image.id,
                "status": c.status,
                "created": c.attrs.get("Created"),
                "state": c.attrs.get("State")
            })
        return {"success": True, "data": {"items": result}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard", dependencies=[Depends(require_permission("system.maintenance.view"))])
def docker_dashboard(
    current_user: User = Depends(get_current_user)
):
    client = get_docker_client()
    try:
        containers = client.containers.list(all=True)
        running = sum(1 for c in containers if c.status == "running")
        total = len(containers)
        
        return {
            "success": True,
            "data": {
                "total": total,
                "running": running,
                "stopped": total - running
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/containers/{container_id}/logs", dependencies=[Depends(require_permission("system.maintenance.view"))])
def get_container_logs(
    container_id: str,
    tail: int = 100,
    current_user: User = Depends(get_current_user)
):
    client = get_docker_client()
    try:
        container = client.containers.get(container_id)
        logs = container.logs(tail=tail, stdout=True, stderr=True, timestamps=True)
        return {"success": True, "data": {"logs": logs.decode("utf-8")}}
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Container not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/containers/{container_id}/restart", dependencies=[Depends(require_permission("system.maintenance.toggle"))])
def restart_container(
    container_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    client = get_docker_client()
    try:
        container = client.containers.get(container_id)
        container.restart()
        
        AdminAuditService.log_action(
            db=db,
            admin_id=current_user.id,
            action="RESTART_CONTAINER",
            target_id=container_id,
            target_type="DOCKER",
            details={"container": container.name}
        )
        return {"success": True, "message": "Container restarted"}
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Container not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/containers/{container_id}/stop", dependencies=[Depends(require_permission("system.maintenance.toggle"))])
def stop_container(
    container_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    client = get_docker_client()
    try:
        container = client.containers.get(container_id)
        container.stop()
        
        AdminAuditService.log_action(
            db=db,
            admin_id=current_user.id,
            action="STOP_CONTAINER",
            target_id=container_id,
            target_type="DOCKER",
            details={"container": container.name}
        )
        return {"success": True, "message": "Container stopped"}
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Container not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/containers/{container_id}", dependencies=[Depends(require_permission("system.maintenance.toggle"))])
def remove_container(
    container_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    client = get_docker_client()
    try:
        container = client.containers.get(container_id)
        container.remove(force=True)
        
        AdminAuditService.log_action(
            db=db,
            admin_id=current_user.id,
            action="REMOVE_CONTAINER",
            target_id=container_id,
            target_type="DOCKER",
            details={"container": container.name}
        )
        return {"success": True, "message": "Container removed"}
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Container not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
