from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from typing import List

from app.dependencies.database import get_db
from app.dependencies.auth import get_current_user_dep_optional, get_current_admin_dep
from app.schemas.responses import SuccessResponse
from app.schemas.system_error import SystemErrorCreate, SystemErrorResponse
from app.models.system_error import SystemError
from app.models.user import User
from app.core.rate_limit import limiter

router = APIRouter()

@router.post("/", response_model=SuccessResponse[SystemErrorResponse])
@limiter.limit("10/minute")
def log_system_error(req: SystemErrorCreate, request: Request, db: Session = Depends(get_db), current_user: User | None = Depends(get_current_user_dep_optional)):
    new_error = SystemError(
        user_id=current_user.id if current_user else None,
        route=req.route,
        browser=req.browser,
        stack_trace=req.stack_trace
    )
    db.add(new_error)
    db.commit()
    db.refresh(new_error)
    
    return SuccessResponse(message="Error logged successfully.", data=new_error)

@router.get("/admin", response_model=SuccessResponse[List[SystemErrorResponse]])
def get_all_system_errors(db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin_dep)):
    errors = db.query(SystemError).order_by(SystemError.created_at.desc()).all()
    return SuccessResponse(message="System errors retrieved.", data=errors)
