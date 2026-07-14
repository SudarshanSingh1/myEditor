from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, func
from datetime import date, timedelta
from typing import List, Dict, Any

from app.database.session import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.user_activity import UserActivity
from app.schemas.responses import SuccessResponse

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/activity/heatmap", response_model=SuccessResponse[Dict[str, Any]])
async def get_activity_heatmap(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Get last 365 days of activity
    one_year_ago = date.today() - timedelta(days=365)
    
    result = await db.execute(
        select(UserActivity)
        .where(UserActivity.user_id == current_user.id)
        .where(UserActivity.activity_date >= one_year_ago)
        .order_by(UserActivity.activity_date.desc())
    )
    activities = result.scalars().all()
    
    # Calculate streaks
    current_streak = 0
    max_streak = 0
    temp_streak = 0
    
    # Sort activities ascending for streak calculation
    sorted_activities = sorted(activities, key=lambda x: x.activity_date)
    
    heatmap_data = []
    
    if sorted_activities:
        prev_date = sorted_activities[0].activity_date - timedelta(days=1)
        
        for activity in sorted_activities:
            heatmap_data.append({
                "date": activity.activity_date.isoformat(),
                "count": activity.count
            })
            
            if (activity.activity_date - prev_date).days == 1:
                temp_streak += 1
            else:
                temp_streak = 1
                
            if temp_streak > max_streak:
                max_streak = temp_streak
                
            prev_date = activity.activity_date
            
        # Check current streak
        # If the last activity was today or yesterday, streak is alive
        last_activity_date = sorted_activities[-1].activity_date
        if (date.today() - last_activity_date).days <= 1:
            current_streak = temp_streak
        else:
            current_streak = 0
            
    return SuccessResponse(
        message="Activity retrieved",
        data={
            "heatmap": heatmap_data,
            "current_streak": current_streak,
            "max_streak": max_streak
        }
    )

@router.post("/activity/record", response_model=SuccessResponse[dict])
async def record_activity(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    today = date.today()
    
    # Check if activity already exists for today
    result = await db.execute(
        select(UserActivity).where(
            UserActivity.user_id == current_user.id,
            UserActivity.activity_date == today
        )
    )
    activity = result.scalar_one_or_none()
    
    if activity:
        activity.count += 1
    else:
        activity = UserActivity(
            user_id=current_user.id,
            activity_date=today,
            count=1
        )
        db.add(activity)
        
    await db.commit()
    
    return SuccessResponse(message="Activity recorded", data={"count": activity.count, "date": today.isoformat()})
