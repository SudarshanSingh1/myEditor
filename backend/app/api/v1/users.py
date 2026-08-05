from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import cast, String, select, func
from datetime import date, timedelta
from typing import Dict, Any, Optional
from pydantic import BaseModel


class RecordActivityRequest(BaseModel):
    date: Optional[str] = None


from app.dependencies.database import get_db
from app.dependencies.auth import get_current_user_dep as get_current_user
from app.models.user import User
from app.models.user_activity import UserActivity
from app.models.execution_log import ExecutionLog
from app.schemas.responses import SuccessResponse

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/activity/heatmap", response_model=SuccessResponse[Dict[str, Any]])
def get_activity_heatmap(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    one_year_ago = date.today() - timedelta(days=365)

    result = db.execute(
        select(
            UserActivity.activity_date.label("exec_date"),
            UserActivity.count,
        )
        .where(UserActivity.user_id == current_user.id)
        .where(UserActivity.activity_date >= one_year_ago)
        .order_by(UserActivity.activity_date.asc())
    )
    activities = result.all()

    current_streak = 0
    max_streak = 0
    temp_streak = 0

    heatmap_data = []

    if activities:
        # activities[0][0] is the date, activities[0][1] is the count
        # In SQLAlchemy, depending on the version and dialect, it might be accessible via index or attribute. Let's use index.
        first_date = activities[0][0]
        if isinstance(first_date, str):
            first_date = date.fromisoformat(first_date)

        prev_date = first_date - timedelta(days=1)

        for activity in activities:
            curr_date = activity[0]
            if isinstance(curr_date, str):
                curr_date = date.fromisoformat(curr_date)

            heatmap_data.append({"date": curr_date.isoformat(), "count": activity[1]})

            if (curr_date - prev_date).days == 1:
                temp_streak += 1
            else:
                temp_streak = 1

            if temp_streak > max_streak:
                max_streak = temp_streak

            prev_date = curr_date

        last_activity_date = activities[-1][0]
        if isinstance(last_activity_date, str):
            last_activity_date = date.fromisoformat(last_activity_date)

        if (date.today() - last_activity_date).days <= 1:
            current_streak = temp_streak
        else:
            current_streak = 0

    return SuccessResponse(
        message="Activity retrieved",
        data={
            "heatmap": heatmap_data,
            "current_streak": current_streak,
            "max_streak": max_streak,
        },
    )


@router.post("/activity/record", response_model=SuccessResponse[dict])
def record_activity(
    req: RecordActivityRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if req.date:
        today = date.fromisoformat(req.date)
    else:
        today = date.today()

    # Check if activity already exists for today
    result = db.execute(
        select(UserActivity).where(
            UserActivity.user_id == current_user.id, UserActivity.activity_date == today
        )
    )
    activity = result.scalar_one_or_none()

    if activity:
        activity.count += 1
    else:
        activity = UserActivity(user_id=current_user.id, activity_date=today, count=1)
        db.add(activity)

    db.commit()

    return SuccessResponse(
        message="Activity recorded",
        data={"count": activity.count, "date": today.isoformat()},
    )


@router.get(
    "/activity/executions-chart", response_model=SuccessResponse[Dict[str, Any]]
)
def get_executions_chart(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    # Last 30 days
    thirty_days_ago = date.today() - timedelta(days=30)

    # Query execution logs
    result = db.execute(
        select(
            func.date(ExecutionLog.created_at).label("date"),
            cast(ExecutionLog.status, String).label("status"),
            func.count(ExecutionLog.id).label("count"),
        )
        .where(ExecutionLog.user_id == current_user.id)
        .where(ExecutionLog.created_at >= thirty_days_ago)
        .group_by(func.date(ExecutionLog.created_at), cast(ExecutionLog.status, String))
    )
    rows = result.all()

    # Group by date
    # Format: { "YYYY-MM-DD": { "date": "MM-DD", "success": 0, "error": 0, "total": 0 } }
    data_by_date = {}
    for i in range(30, -1, -1):
        d = date.today() - timedelta(days=i)
        data_by_date[d.isoformat()] = {
            "date": d.strftime("%b %d"),
            "success": 0,
            "error": 0,
            "total": 0,
        }

    for row in rows:
        row_date_str = (
            row.date.isoformat() if hasattr(row.date, "isoformat") else str(row.date)
        )
        if row_date_str in data_by_date:
            count = row.count
            data_by_date[row_date_str]["total"] += count
            if getattr(row, "status", "").lower() == "success":
                data_by_date[row_date_str]["success"] += count
            else:
                data_by_date[row_date_str]["error"] += count

    chart_data = list(data_by_date.values())
    return SuccessResponse(
        message="Execution chart data retrieved", data={"items": chart_data}
    )


@router.get(
    "/activity/execution-summary", response_model=SuccessResponse[Dict[str, Any]]
)
def get_execution_summary(
    today: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = select(
        cast(ExecutionLog.status, String).label("status"), func.count(ExecutionLog.id)
    ).where(ExecutionLog.user_id == current_user.id)

    if today:
        query = query.where(func.date(ExecutionLog.created_at) == date.today())

    query = query.group_by(cast(ExecutionLog.status, String))

    result = db.execute(query)
    rows = result.all()

    total = 0
    success = 0
    error = 0

    for row in rows:
        total += row[1]
        if str(row[0]).lower() == "success":
            success += row[1]
        else:
            error += row[1]

    success_rate = (success / total * 100) if total > 0 else 0
    error_rate = (error / total * 100) if total > 0 else 0

    return SuccessResponse(
        message="Execution summary retrieved",
        data={
            "total": total,
            "success": success,
            "error": error,
            "success_rate": round(success_rate, 1),
            "error_rate": round(error_rate, 1),
        },
    )
