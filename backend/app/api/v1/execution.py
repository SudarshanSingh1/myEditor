from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import logging

logger = logging.getLogger(__name__)
from typing import Any

from app.dependencies.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.responses import SuccessResponse
from app.execution.schemas.execution import ExecutionRequest, ExecutionResponse
from app.execution.services.execution_service import ExecutionService

router = APIRouter()

@router.post("/run", response_model=SuccessResponse[ExecutionResponse])
def run_code(
    request: ExecutionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Executes a file inside a secure Docker container.
    """
    service = ExecutionService(db)
    try:
        result = service.run_code(request, current_user.id)
        return SuccessResponse(message="Execution complete", data=result)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Execution failed with internal error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Execution failed due to an internal server error."
        )

@router.post("/run/stop", response_model=SuccessResponse[dict])
def stop_execution(
    container_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Stops a running execution.
    Currently limited due to synchronous execution architecture.
    """
    service = ExecutionService(db)
    try:
        service.stop_execution(container_id, current_user.id)
        return SuccessResponse(message="Execution stopped", data={})
    except NotImplementedError as e:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Stop execution failed with internal error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to stop execution."
        )
