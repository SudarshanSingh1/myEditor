import pytest
from app.models.system_settings import SystemSettings
from app.models.user import User, RoleEnum, StatusEnum
import uuid
from datetime import datetime, timezone

def test_system_status_endpoint(client, db_session):
    # 1. No settings
    resp = client.get("/api/v1/system/status")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["maintenance_enabled"] is False
    assert data["allow_admin"] is True
    assert data["countdown"] is None
    
    # 2. With settings
    settings = SystemSettings(
        id=1,
        maintenance_mode=True,
        maintenance_message="Upgrading DB",
        maintenance_show_countdown=True,
        maintenance_end_time=datetime(2025, 1, 1, tzinfo=timezone.utc),
        maintenance_allow_admin_access=False
    )
    db_session.add(settings)
    db_session.commit()
    
    resp = client.get("/api/v1/system/status")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["maintenance_enabled"] is True
    assert data["message"] == "Upgrading DB"
    assert data["countdown"] is not None
    assert data["allow_admin"] is False
    
    # 3. Test Admin Put maintenance
    user = User(
        id=uuid.uuid4(),
        email="maint_admin@example.com",
        username="maint_admin",
        password_hash="hashed",
        role=RoleEnum.OWNER,
        email_verified=True,
        status=StatusEnum.ACTIVE
    )
    db_session.add(user)
    db_session.commit()
    from app.core.security import create_access_token
    token = create_access_token(user.id)
    client.cookies.set("access_token", token)
    
    resp = client.put("/api/v1/admin/maintenance", json={
        "maintenance_mode": False
    })
    assert resp.status_code == 200
    
    # Verify it cleared
    db_session.refresh(settings)
    assert settings.maintenance_mode is False
    assert settings.maintenance_end_time is None

