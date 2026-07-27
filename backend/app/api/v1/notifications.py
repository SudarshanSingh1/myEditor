from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.dependencies.database import get_db
from app.models.user import User
from app.models.notification import Notification, NotificationType, UserNotificationSettings
from app.dependencies.auth import get_current_user
from app.dependencies.auth import require_admin
from app.services.admin_audit_service import AdminAuditService

router = APIRouter()

@router.get("")
@router.get("/")
def get_user_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    unread_only: bool = False,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        query = query.filter(Notification.is_read == False)
        
    total = query.count()
    notifications = query.order_by(Notification.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    
    return {
        "success": True,
        "data": {
            "items": [
                {
                    "id": n.id,
                    "type": n.type,
                    "title": n.title,
                    "message": n.message,
                    "is_read": n.is_read,
                    "created_at": n.created_at.isoformat()
                } for n in notifications
            ],
            "total": total
        }
    }

@router.post("/{notification_id}/read")
def mark_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notif = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notif.is_read = True
    db.commit()
    return {"success": True}

@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db.query(Notification).filter(Notification.user_id == current_user.id).update({"is_read": True})
    db.commit()
    return {"success": True}

from app.models.notification import Notification, NotificationType

@router.post("/broadcast", dependencies=[Depends(require_admin)])
def broadcast_notification(
    title: str,
    message: str,
    background_tasks: BackgroundTasks,
    type: NotificationType = NotificationType.BROADCAST,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    users = db.query(User).all()
    notifications = []
    
    from app.services.email_service import EmailService
    
    for u in users:
        notifications.append(
            Notification(
                user_id=u.id,
                type=type,
                title=title,
                message=message
            )
        )
        # Send an email notification for the broadcast
        background_tasks.add_task(EmailService.send_custom_email, str(u.id), f"Broadcast: {title}", message)
        
    db.add_all(notifications)
    db.commit()
    
    AdminAuditService.log_action(
        db=db,
        actor_id=current_user.id,
        action="BROADCAST_NOTIFICATION",
        metadata_json={"title": title, "type": type.value, "target_type": "SYSTEM", "target_id": "ALL_USERS"}
    )
    
    return {"success": True, "message": f"Broadcast sent to {len(users)} users"}
