from app.models.user import User, RoleEnum, StatusEnum
from app.core.security import create_access_token
import uuid


def create_admin_user_and_token(db_session):
    user = User(
        id=uuid.uuid4(),
        email="owner_flags@example.com",
        username="owner_flags",
        password_hash="hashed",
        role=RoleEnum.OWNER,
        email_verified=True,
        status=StatusEnum.ACTIVE,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    token = create_access_token(user.id)
    return user, token


def test_feature_flags_crud(client, db_session):
    user, token = create_admin_user_and_token(db_session)
    client.cookies.set("access_token", token)

    # 1. List (empty)
    resp = client.get("/api/v1/admin/feature-flags/")
    assert resp.status_code == 200
    assert len(resp.json()["data"]["items"]) == 0

    # 2. Create
    req_data = {
        "name": "Beta Feature",
        "key": "beta-feature-key",
        "description": "A feature in beta",
        "enabled": False,
        "environment": "production",
        "rollout_percentage": 50,
    }
    resp = client.post("/api/v1/admin/feature-flags/", json=req_data)
    assert resp.status_code == 200

    # 3. List (one item)
    resp = client.get("/api/v1/admin/feature-flags/")
    assert resp.status_code == 200
    items = resp.json()["data"]["items"]
    assert len(items) == 1
    assert items[0]["name"] == "Beta Feature"
    assert items[0]["key"] == "beta-feature-key"
    assert items[0]["enabled"] is False
    assert items[0]["rollout_percentage"] == 50

    flag_id = items[0]["id"]

    # 4. Update
    req_update = {
        "name": "Beta Feature Updated",
        "key": "beta-feature-key-updated",
        "enabled": True,
        "environment": "production",
        "rollout_percentage": 100,
    }
    resp = client.put(f"/api/v1/admin/feature-flags/{flag_id}", json=req_update)
    assert resp.status_code == 200

    resp = client.get("/api/v1/admin/feature-flags/")
    items = resp.json()["data"]["items"]
    assert items[0]["name"] == "Beta Feature Updated"
    assert items[0]["key"] == "beta-feature-key-updated"
    assert items[0]["enabled"] is True

    # 5. Delete
    resp = client.delete(f"/api/v1/admin/feature-flags/{flag_id}")
    assert resp.status_code == 200

    resp = client.get("/api/v1/admin/feature-flags/")
    assert len(resp.json()["data"]["items"]) == 0
