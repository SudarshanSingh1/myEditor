import pytest
from app.models.user import User, RoleEnum, StatusEnum
from app.core.security import create_access_token
import uuid

def create_user_and_token(db_session, role=RoleEnum.USER, username="feedback_user"):
    user = User(
        id=uuid.uuid4(),
        email=f"{username}@example.com",
        username=username,
        password_hash="hashed",
        role=role,
        email_verified=True,
        status=StatusEnum.ACTIVE
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    token = create_access_token(user.id)
    return user, token

def test_feedback_crud(client, db_session):
    user, token = create_user_and_token(db_session)
    client.cookies.set("access_token", token)
    
    # 1. Submit feedback
    req_data = {
        "category": "Bug Report",
        "priority": "High",
        "subject": "App crashes on login",
        "description": "When I click login, it crashes.",
        "browser_info": "Chrome 90",
        "os": "macOS",
        "app_version": "1.0.0",
        "current_route": "/login"
    }
    resp = client.post("/api/v1/feedback/", json=req_data)
    assert resp.status_code == 200
    data = resp.json()["data"]
    feedback_id = data["id"]
    
    # 2. Get my feedback
    resp = client.get("/api/v1/feedback/mine")
    assert resp.status_code == 200
    items = resp.json()["data"]
    assert len(items) == 1
    assert items[0]["subject"] == "App crashes on login"
    
    # 3. Get all feedback (admin) - should fail for normal user
    resp = client.get("/api/v1/feedback/admin")
    assert resp.status_code in [401, 403]
    
    # Switch to admin
    admin, admin_token = create_user_and_token(db_session, role=RoleEnum.ADMIN, username="feedback_admin")
    client.cookies.set("access_token", admin_token)
    
    # 4. Get all feedback as admin
    resp = client.get("/api/v1/feedback/admin")
    assert resp.status_code == 200
    assert len(resp.json()["data"]) == 1
    
    # 5. Update feedback status
    update_req = {
        "status": "In Progress",
        "admin_reply": "We are looking into this."
    }
    resp = client.patch(f"/api/v1/feedback/admin/{feedback_id}", json=update_req)
    assert resp.status_code == 200
    assert resp.json()["data"]["status"] == "In Progress"
    
    # 6. Delete feedback
    resp = client.delete(f"/api/v1/feedback/admin/{feedback_id}")
    assert resp.status_code == 200
    
    resp = client.get("/api/v1/feedback/admin")
    assert len(resp.json()["data"]) == 0
