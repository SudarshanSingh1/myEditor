from app.models.user import User, RoleEnum, StatusEnum
from app.core.security import create_access_token
import uuid


def create_user_and_token(db_session, role=RoleEnum.USER, username="error_user"):
    user = User(
        id=uuid.uuid4(),
        email=f"{username}@example.com",
        username=username,
        password_hash="hashed",
        role=role,
        email_verified=True,
        status=StatusEnum.ACTIVE,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    token = create_access_token(user.id)
    return user, token


def test_system_errors_crud(client, db_session):
    # 1. Log an error anonymously
    req_data = {
        "route": "/frontend-route",
        "browser": "Firefox",
        "stack_trace": "TypeError: Cannot read properties of undefined",
    }
    resp = client.post("/api/v1/system-errors/", json=req_data)
    assert resp.status_code == 200

    # 2. Get all errors as admin
    admin, admin_token = create_user_and_token(
        db_session, role=RoleEnum.ADMIN, username="error_admin"
    )
    client.cookies.set("access_token", admin_token)

    resp = client.get("/api/v1/system-errors/admin")
    assert resp.status_code == 200
    items = resp.json()["data"]
    assert len(items) == 1
    assert items[0]["route"] == "/frontend-route"
    assert items[0]["browser"] == "Firefox"
