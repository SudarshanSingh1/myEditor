import pytest
from app.models.user import User, RoleEnum, StatusEnum
from app.models.notification import Notification
from app.core.security import create_access_token
import uuid

def create_admin_user_and_token(db_session):
    user = User(
        id=uuid.uuid4(),
        email="owner_notifications@example.com",
        username="owner_notifications",
        password_hash="hashed",
        role=RoleEnum.OWNER,
        email_verified=True,
        status=StatusEnum.ACTIVE
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    token = create_access_token(user.id)
    return user, token

def test_notifications_crud(client, db_session):
    user, token = create_admin_user_and_token(db_session)
    client.cookies.set("access_token", token)
    
    # 1. Create a broadcast notification
    resp = client.post("/api/v1/notifications/broadcast?title=TestTitle&message=TestMessage")
    assert resp.status_code == 200
    
    # 2. Get user notifications
    resp = client.get("/api/v1/notifications/")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data["items"]) == 1
    
    notif_id = data["items"][0]["id"]
    assert data["items"][0]["title"] == "TestTitle"
    assert data["items"][0]["is_read"] is False
    
    # 3. Mark read
    resp = client.post(f"/api/v1/notifications/{notif_id}/read")
    assert resp.status_code == 200
    
    # Verify read
    resp = client.get("/api/v1/notifications/?unread_only=true")
    assert len(resp.json()["data"]["items"]) == 0
    
    # Create another one to test read-all
    client.post("/api/v1/notifications/broadcast?title=Another&message=More")
    resp = client.get("/api/v1/notifications/?unread_only=true")
    assert len(resp.json()["data"]["items"]) == 1
    
    # 4. Mark all read
    resp = client.post("/api/v1/notifications/read-all")
    assert resp.status_code == 200
    
    resp = client.get("/api/v1/notifications/?unread_only=true")
    assert len(resp.json()["data"]["items"]) == 0
