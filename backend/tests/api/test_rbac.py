import pytest
from app.models.user import User, RoleEnum, StatusEnum
from app.core.security import create_access_token
import uuid

def create_user_and_token(db_session, role, permissions=None):
    user = User(
        id=uuid.uuid4(),
        email=f"{role.value}_rbac@example.com",
        username=f"{role.value}_rbac",
        password_hash="hashed",
        role=role,
        email_verified=True,
        status=StatusEnum.ACTIVE,
        effective_permissions=permissions or []
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    token = create_access_token(user.id)
    return user, token

def test_get_my_permissions_owner(client, db_session):
    user, token = create_user_and_token(db_session, RoleEnum.OWNER)
    client.cookies.set("access_token", token)
    
    resp = client.get("/api/v1/rbac/my-permissions")
    assert resp.status_code == 200
    data = resp.json()
    assert data["role"] == RoleEnum.OWNER.value
    assert data["permissions"] == ["*"]

def test_get_my_permissions_admin(client, db_session):
    user, token = create_user_and_token(db_session, RoleEnum.ADMIN, ["projects.create", "users.view"])
    client.cookies.set("access_token", token)
    
    resp = client.get("/api/v1/rbac/my-permissions")
    assert resp.status_code == 200
    data = resp.json()
    assert data["role"] == RoleEnum.ADMIN.value
    assert "projects.create" in data["permissions"]
