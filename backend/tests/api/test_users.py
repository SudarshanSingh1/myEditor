import pytest
from app.models.user import User, RoleEnum, StatusEnum
from app.models.execution_log import ExecutionLog, ExecutionStatus
from datetime import date, timedelta, datetime

def create_test_user(db_session):
    user = User(
        email="test_user@example.com",
        username="testuser",
        password_hash="hashed_password",
        role=RoleEnum.USER,
        email_verified=True,
        status=StatusEnum.ACTIVE
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

def test_activity_heatmap(client, db_session):
    from app.main import app
    from app.dependencies.auth import get_current_user_dep
    
    user = create_test_user(db_session)
    app.dependency_overrides[get_current_user_dep] = lambda: user
    
    today = datetime.utcnow()
    yesterday = today - timedelta(days=1)
    
    log1 = ExecutionLog(
        user_id=user.id,
        project_id=None,
        language="python",
        status=ExecutionStatus.SUCCESS,
        created_at=today
    )
    log2 = ExecutionLog(
        user_id=user.id,
        project_id=None,
        language="python",
        status=ExecutionStatus.SUCCESS,
        created_at=yesterday
    )
    db_session.add_all([log1, log2])
    db_session.commit()
    
    resp = client.get("/api/v1/users/activity/heatmap")
    assert resp.status_code == 200
    data = resp.json()["data"]
    
    assert "heatmap" in data
    assert "current_streak" in data
    assert "max_streak" in data
    
    assert len(data["heatmap"]) == 2
    assert data["current_streak"] >= 2
    assert data["max_streak"] >= 2
    
    app.dependency_overrides.clear()

def test_record_activity(client, db_session):
    from app.main import app
    from app.dependencies.auth import get_current_user_dep
    
    user = create_test_user(db_session)
    app.dependency_overrides[get_current_user_dep] = lambda: user
    
    resp = client.post("/api/v1/users/activity/record", json={})
    assert resp.status_code == 200
    assert resp.json()["message"] == "Activity recorded"
    
    resp2 = client.post("/api/v1/users/activity/record", json={"date": "2023-01-01"})
    assert resp2.status_code == 200
    assert resp2.json()["message"] == "Activity recorded"
    
    app.dependency_overrides.clear()

def test_executions_chart(client, db_session):
    from app.main import app
    from app.dependencies.auth import get_current_user_dep
    
    user = create_test_user(db_session)
    app.dependency_overrides[get_current_user_dep] = lambda: user
    
    resp = client.get("/api/v1/users/activity/executions-chart")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "items" in data
    
    app.dependency_overrides.clear()

def test_execution_summary(client, db_session):
    from app.main import app
    from app.dependencies.auth import get_current_user_dep
    
    user = create_test_user(db_session)
    app.dependency_overrides[get_current_user_dep] = lambda: user
    
    resp = client.get("/api/v1/users/activity/execution-summary")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "total" in data
    assert "success_rate" in data
    
    app.dependency_overrides.clear()
