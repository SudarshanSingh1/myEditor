import pytest
from app.models.user import User, RoleEnum, StatusEnum
from app.models.secret import Secret
from app.core.security import create_access_token
import uuid

def create_admin_user_and_token(db_session):
    user = User(
        id=uuid.uuid4(),
        email="owner_secrets@example.com",
        username="owner_secrets",
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

def test_secrets_crud(client, db_session):
    user, token = create_admin_user_and_token(db_session)
    client.cookies.set("access_token", token)
    
    # 1. List (empty)
    resp = client.get("/api/v1/admin/secrets/")
    assert resp.status_code == 200
    assert len(resp.json()["data"]["items"]) == 0
    
    # 2. Create
    req_data = {
        "name": "TEST_SECRET",
        "category": "database",
        "value": "super_secret_password"
    }
    resp = client.post("/api/v1/admin/secrets/", json=req_data)
    assert resp.status_code == 200
    
    # 3. List (one item)
    resp = client.get("/api/v1/admin/secrets/")
    assert resp.status_code == 200
    items = resp.json()["data"]["items"]
    assert len(items) == 1
    assert items[0]["name"] == "TEST_SECRET"
    assert items[0]["category"] == "database"
    assert items[0]["masked_value"] != "super_secret_password"
    assert "****" in items[0]["masked_value"]
    
    secret_id = items[0]["id"]
    
    # 4. Update
    req_update = {
        "name": "TEST_SECRET_UPDATED",
        "category": "api",
        "value": "new_super_secret"
    }
    resp = client.put(f"/api/v1/admin/secrets/{secret_id}", json=req_update)
    assert resp.status_code == 200
    
    resp = client.get("/api/v1/admin/secrets/")
    items = resp.json()["data"]["items"]
    assert items[0]["name"] == "TEST_SECRET_UPDATED"
    
    # 5. Delete
    resp = client.delete(f"/api/v1/admin/secrets/{secret_id}")
    assert resp.status_code == 200
    
    resp = client.get("/api/v1/admin/secrets/")
    assert len(resp.json()["data"]["items"]) == 0
