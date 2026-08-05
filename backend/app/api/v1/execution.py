from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
import logging

logger = logging.getLogger(__name__)
from typing import Any

from app.dependencies.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.user_activity import UserActivity
from app.schemas.responses import SuccessResponse
from app.execution.schemas.execution import ExecutionRequest, ExecutionResponse
from app.execution.services.execution_service import ExecutionService
from datetime import date
from sqlalchemy import select

router = APIRouter()


@router.post("/run", response_model=SuccessResponse[ExecutionResponse])
def run_code(
    request: ExecutionRequest,
    req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Executes a file inside a secure Docker container.
    """
    service = ExecutionService(db)
    try:
        result = service.run_code(request, current_user.id)

        # Record activity
        try:
            today = date.today()
            activity_result = db.execute(
                select(UserActivity).where(
                    UserActivity.user_id == current_user.id,
                    UserActivity.activity_date == today,
                )
            )
            activity = activity_result.scalar_one_or_none()
            if activity:
                activity.count += 1
            else:
                activity = UserActivity(
                    user_id=current_user.id, activity_date=today, count=1
                )
                db.add(activity)

            # Record audit log
            from app.services.audit_service import AuditService

            ip_address = req.headers.get(
                "x-forwarded-for", req.client.host if req.client else None
            )
            if ip_address:
                ip_address = ip_address.split(",")[0].strip()
            user_agent = req.headers.get("user-agent", "Unknown")
            AuditService.log_action(
                db,
                current_user.id,
                "EXECUTION_RUN",
                ip_address,
                user_agent,
                {
                    "project_id": str(request.project_id),
                    "file_id": str(request.file_id),
                    "language": request.language,
                },
            )

            db.commit()
        except Exception as act_err:
            logger.error(f"Failed to record activity or audit: {act_err}")

        return SuccessResponse(message="Execution complete", data=result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Execution failed with internal error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Execution failed due to an internal server error.",
        )


@router.post("/run/stop", response_model=SuccessResponse[dict])
def stop_execution(
    container_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=str(e))
    except Exception as e:
        logger.error(f"Stop execution failed with internal error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to stop execution.",
        )
