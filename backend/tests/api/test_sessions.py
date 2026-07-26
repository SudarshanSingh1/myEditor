import pytest
from app.models.user import User, RoleEnum, StatusEnum
from app.models.user_session import UserSession
from app.core.security import create_access_token
from datetime import datetime, timedelta

def create_test_user_and_token(db_session):
    user = User(
        email="session_user@example.com",
        username="session_user",
        password_hash="hashed_password",
        role=RoleEnum.USER,
        email_verified=True,
        status=StatusEnum.ACTIVE
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    token = create_access_token(user.id)
    return user, token

def test_get_sessions(client, db_session):
    user, token = create_test_user_and_token(db_session)
    headers = {"Authorization": f"Bearer {token}"}
    
    s1 = UserSession(
        user_id=user.id,
        session_token_jti="ref1",
        ip_address="127.0.0.1",
        device_type="desktop",
        browser="Chrome",
        os="Mac",
        is_active=True,
        last_active_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(days=30)
    )
    s2 = UserSession(
        user_id=user.id,
        session_token_jti="ref2",
        ip_address="192.168.1.1",
        device_type="mobile",
        browser="Safari",
        os="iOS",
        is_active=False,
        last_active_at=datetime.utcnow() - timedelta(days=1),
        expires_at=datetime.utcnow() + timedelta(days=30)
    )
    db_session.add_all([s1, s2])
    db_session.commit()
    
    resp = client.get("/api/v1/sessions", headers=headers)
    assert resp.status_code == 200
    data = resp.json()["data"]["sessions"]
    
    # Should only return active sessions
    assert len(data) == 1
    assert data[0]["browser"] == "Chrome"

def test_revoke_session(client, db_session):
    user, token = create_test_user_and_token(db_session)
    headers = {"Authorization": f"Bearer {token}"}
    
    s1 = UserSession(
        user_id=user.id,
        session_token_jti="ref1",
        is_active=True,
        expires_at=datetime.utcnow() + timedelta(days=30)
    )
    db_session.add(s1)
    db_session.commit()
    
    resp = client.delete(f"/api/v1/sessions/{s1.id}", headers=headers)
    assert resp.status_code == 200
    
    db_session.refresh(s1)
    assert s1.is_active is False
    
    # Test not found
    import uuid
    resp = client.delete(f"/api/v1/sessions/{uuid.uuid4()}", headers=headers)
    assert resp.status_code == 404

def test_revoke_all_sessions(client, db_session):
    user, token = create_test_user_and_token(db_session)
    headers = {"Authorization": f"Bearer {token}"}
    
    s1 = UserSession(user_id=user.id, session_token_jti="ref1", is_active=True, expires_at=datetime.utcnow() + timedelta(days=30))
    s2 = UserSession(user_id=user.id, session_token_jti="ref2", is_active=True, expires_at=datetime.utcnow() + timedelta(days=30))
    db_session.add_all([s1, s2])
    db_session.commit()
    
    resp = client.delete("/api/v1/sessions", headers=headers)
    assert resp.status_code == 200
    
    db_session.refresh(s1)
    db_session.refresh(s2)
    assert s1.is_active is False
    assert s2.is_active is False
