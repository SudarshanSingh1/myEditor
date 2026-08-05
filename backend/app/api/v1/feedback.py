from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.dependencies.database import get_db
from app.dependencies.auth import get_current_user_dep, get_current_admin_dep
from app.schemas.responses import SuccessResponse
from app.schemas.feedback import FeedbackCreate, FeedbackUpdateStatus, FeedbackResponse
from app.models.feedback import Feedback
from app.models.user import User
from app.core.rate_limit import limiter
from app.services.audit_service import AuditService

router = APIRouter()


@router.post("/", response_model=SuccessResponse[FeedbackResponse])
@limiter.limit("5/minute")
def submit_feedback(
    req: FeedbackCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_dep),
):
    new_feedback = Feedback(
        user_id=current_user.id,
        category=req.category,
        priority=req.priority,
        subject=req.subject,
        description=req.description,
        browser_info=req.browser_info,
        os=req.os,
        app_version=req.app_version,
        current_route=req.current_route,
    )
    db.add(new_feedback)
    db.commit()
    db.refresh(new_feedback)

    return SuccessResponse(
        message="Feedback submitted successfully.", data=new_feedback
    )


@router.get("/mine", response_model=SuccessResponse[List[FeedbackResponse]])
def get_my_feedback(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user_dep)
):
    feedback_items = (
        db.query(Feedback)
        .filter(Feedback.user_id == current_user.id)
        .order_by(Feedback.created_at.desc())
        .all()
    )
    return SuccessResponse(message="Feedback retrieved.", data=feedback_items)


@router.get("/admin", response_model=SuccessResponse[List[FeedbackResponse]])
def get_all_feedback(
    db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin_dep)
):
    feedback_items = db.query(Feedback).order_by(Feedback.created_at.desc()).all()
    return SuccessResponse(message="Feedback retrieved.", data=feedback_items)


@router.patch("/admin/{feedback_id}", response_model=SuccessResponse[FeedbackResponse])
def update_feedback_status(
    feedback_id: uuid.UUID,
    req: FeedbackUpdateStatus,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_dep),
):
    item = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found"
        )

    old_status = item.status
    item.status = req.status
    if req.admin_reply is not None:
        item.admin_reply = req.admin_reply
    db.commit()
    db.refresh(item)

    AuditService.log_action(
        db,
        current_admin.id,
        "UPDATE_FEEDBACK_STATUS",
        request.client.host,
        request.headers.get("user-agent"),
        {
            "feedback_id": str(feedback_id),
            "old_status": old_status,
            "new_status": req.status,
        },
    )
    return SuccessResponse(message="Feedback status updated.", data=item)


@router.delete("/admin/{feedback_id}", response_model=SuccessResponse)
def delete_feedback(
    feedback_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_dep),
):
    item = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found"
        )

    db.delete(item)
    db.commit()

    AuditService.log_action(
        db,
        current_admin.id,
        "DELETE_FEEDBACK",
        request.client.host,
        request.headers.get("user-agent"),
        {"feedback_id": str(feedback_id)},
    )
    return SuccessResponse(message="Feedback deleted successfully.")
