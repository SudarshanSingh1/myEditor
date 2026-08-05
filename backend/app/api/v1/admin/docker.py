from fastapi import APIRouter, Depends, HTTPException
import docker

from app.core.logger import logger
from app.dependencies.auth import require_admin
from app.schemas.responses import SuccessResponse

router = APIRouter()


def get_docker_client():
    try:
        return docker.from_env(timeout=3)
    except Exception as e:
        logger.error(f"Failed to connect to docker socket: {e}")
        raise HTTPException(status_code=500, detail="Docker daemon unavailable")


@router.get("/containers", response_model=SuccessResponse)
def list_containers(admin=Depends(require_admin)):
    client = get_docker_client()
    try:
        containers = client.containers.list(all=True)
        items = []
        for c in containers:
            items.append(
                {
                    "id": c.id,
                    "name": c.name,
                    "image": c.image.tags[0] if c.image.tags else c.image.id,
                    "status": c.status,
                    "created": c.attrs.get("Created", ""),
                    "state": c.attrs.get("State", {}).get("Status", "unknown"),
                }
            )
        return SuccessResponse(message="Containers retrieved", data={"items": items})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/containers/{container_id}/logs", response_model=SuccessResponse)
def get_container_logs(container_id: str, admin=Depends(require_admin)):
    client = get_docker_client()
    try:
        container = client.containers.get(container_id)
        logs = container.logs(tail=200).decode("utf-8", errors="replace")
        return SuccessResponse(message="Logs retrieved", data={"logs": logs})
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Container not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/containers/{container_id}/{action}", response_model=SuccessResponse)
def perform_action(container_id: str, action: str, admin=Depends(require_admin)):
    if action not in ["stop", "restart"]:
        raise HTTPException(status_code=400, detail="Invalid action")

    client = get_docker_client()
    try:
        container = client.containers.get(container_id)
        if action == "stop":
            container.stop(timeout=5)
        elif action == "restart":
            container.restart(timeout=5)
        return SuccessResponse(message=f"Container {action} successful")
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Container not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/containers/{container_id}", response_model=SuccessResponse)
def remove_container(container_id: str, admin=Depends(require_admin)):
    client = get_docker_client()
    try:
        container = client.containers.get(container_id)
        container.remove(force=True)
        return SuccessResponse(message="Container removed")
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Container not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
