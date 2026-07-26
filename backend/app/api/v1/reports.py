from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta

from app.dependencies.database import get_db
from app.models.user import User
from app.models.report import Report, ReportStatus, ReportTargetType
from app.dependencies.auth import get_current_user
from app.dependencies.auth import require_permission
from app.services.admin_audit_service import AdminAuditService

router = APIRouter()

@router.get("/", dependencies=[Depends(require_permission("users.view"))])
def list_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    status: Optional[str] = None,
    target_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    query = db.query(Report)
    
    if status:
        query = query.filter(Report.status == status)
    if target_type:
        query = query.filter(Report.target_type == target_type)
        
    total = query.count()
    reports = query.order_by(Report.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    
    result = []
    for r in reports:
        reporter = r.reporter
        assignee = r.assignee
        result.append({
            "id": r.id,
            "target_type": r.target_type,
            "target_id": r.target_id,
            "reason": r.reason,
            "status": r.status,
            "created_at": r.created_at.isoformat(),
            "reporter": {"id": reporter.id, "username": reporter.username} if reporter else None,
            "assignee": {"id": assignee.id, "username": assignee.username} if assignee else None
        })
        
    return {
        "success": True,
        "data": {
            "items": result,
            "total": total,
            "page": page,
            "limit": limit
        }
    }

@router.get("/analytics", dependencies=[Depends(require_permission("system.analytics.view"))])
def get_report_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total = db.query(Report).count()
    pending = db.query(Report).filter(Report.status == ReportStatus.PENDING).count()
    resolved = db.query(Report).filter(Report.status == ReportStatus.RESOLVED).count()
    rejected = db.query(Report).filter(Report.status == ReportStatus.REJECTED).count()
    
    return {
        "success": True,
        "data": {
            "total": total,
            "pending": pending,
            "resolved": resolved,
            "rejected": rejected
        }
    }

@router.post("/{report_id}/assign", dependencies=[Depends(require_permission("users.manage"))])
def assign_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    report.assigned_to = current_user.id
    report.status = ReportStatus.IN_PROGRESS
    db.commit()
    
    AdminAuditService.log_action(
        db=db,
        actor_id=current_user.id,
        action="ASSIGN_REPORT",
        metadata_json={"report_id": report.id, "assigned_to": current_user.username, "target_type": "REPORT", "target_id": report.id}
    )
    
    return {"success": True, "message": "Report assigned successfully"}

@router.post("/{report_id}/resolve", dependencies=[Depends(require_permission("users.manage"))])
def resolve_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    report.status = ReportStatus.RESOLVED
    db.commit()
    
    AdminAuditService.log_action(
        db=db,
        actor_id=current_user.id,
        action="RESOLVE_REPORT",
        metadata_json={"report_id": report.id, "target_type": "REPORT", "target_id": report.id}
    )
    
    return {"success": True, "message": "Report resolved"}

@router.post("/{report_id}/reject", dependencies=[Depends(require_permission("users.manage"))])
def reject_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    report.status = ReportStatus.REJECTED
    db.commit()
    
    AdminAuditService.log_action(
        db=db,
        actor_id=current_user.id,
        action="REJECT_REPORT",
        metadata_json={"report_id": report.id, "target_type": "REPORT", "target_id": report.id}
    )
    
    return {"success": True, "message": "Report rejected"}
