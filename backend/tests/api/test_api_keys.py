import pytest
from app.models.user import User, RoleEnum, StatusEnum
from app.models.api_key import ApiKey
from app.core.security import create_access_token
import uuid

def create_admin_user_and_token(db_session):
    user = User(
        id=uuid.uuid4(),
        email="owner_api_keys@example.com",
        username="owner_api_keys",
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

def test_list_api_keys_empty(client, db_session):
    user, token = create_admin_user_and_token(db_session)
    client.cookies.set("access_token", token)
    
    resp = client.get("/api/v1/admin/api-keys/")
    assert resp.status_code == 200
    data = resp.json()["data"]["items"]
    assert isinstance(data, list)

def test_create_api_key(client, db_session):
    user, token = create_admin_user_and_token(db_session)
    client.cookies.set("access_token", token)
    
    resp = client.post("/api/v1/admin/api-keys/?name=TestKey")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "raw_key" in data
    assert data["prefix"] == data["raw_key"][:12]
    
    # Verify in DB
    db_key = db_session.query(ApiKey).filter(ApiKey.id == data["id"]).first()
    assert db_key is not None
    assert db_key.name == "TestKey"

def test_revoke_api_key(client, db_session):
    user, token = create_admin_user_and_token(db_session)
    client.cookies.set("access_token", token)
    
    # First create one
    resp1 = client.post("/api/v1/admin/api-keys/?name=KeyToRevoke")
    assert resp1.status_code == 200
    key_id = resp1.json()["data"]["id"]
    
    # Now revoke it
    resp2 = client.post(f"/api/v1/admin/api-keys/{key_id}/revoke")
    assert resp2.status_code == 200
    
    # Verify in DB
    db_key = db_session.query(ApiKey).filter(ApiKey.id == key_id).first()
    assert db_key.revoked_at is not None
