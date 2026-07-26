import pytest
from app.models.user import User, RoleEnum, StatusEnum
from app.models.backup_log import BackupLog
from app.models.deployment_log import DeploymentLog
from app.core.security import create_access_token
import uuid
import datetime

def create_super_admin_and_token(db_session):
    user = User(
        id=uuid.uuid4(),
        email="super_infrastructure@example.com",
        username="super_infrastructure",
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

def test_create_and_get_backups(client, db_session):
    user, token = create_super_admin_and_token(db_session)
    client.cookies.set("access_token", token)
    
    resp_post = client.post("/api/v1/admin/infrastructure/backups", json={"type": "MANUAL"})
    assert resp_post.status_code == 200
    print("BACKUP RESPONSE:", resp_post.json())
    backup_id = resp_post.json()["data"]["id"]
    
    resp_get = client.get("/api/v1/admin/infrastructure/backups")
    assert resp_get.status_code == 200
    data = resp_get.json()["data"]
    assert any(b["id"] == backup_id for b in data)

def test_restore_backup(client, db_session):
    user, token = create_super_admin_and_token(db_session)
    client.cookies.set("access_token", token)
    
    # Create backup first directly
    backup = BackupLog(
        id=str(uuid.uuid4()),
        filename="test.dump",
        size_bytes=100,
        status="COMPLETED",
        type="MANUAL"
    )
    db_session.add(backup)
    db_session.commit()
    
    resp = client.post(f"/api/v1/admin/infrastructure/backups/{backup.id}/restore")
    assert resp.status_code == 200

def test_create_and_get_deployments(client, db_session):
    user, token = create_super_admin_and_token(db_session)
    client.cookies.set("access_token", token)
    
    req_data = {
        "version": "1.0.1",
        "build_number": "123",
        "environment": "production",
        "release_notes": "test deploy"
    }
    
    resp_post = client.post("/api/v1/admin/infrastructure/deployments", json=req_data)
    assert resp_post.status_code == 200
    print("DEPLOYMENT RESPONSE:", resp_post.json())
    dep_id = resp_post.json()["data"]["id"]
    
    resp_get = client.get("/api/v1/admin/infrastructure/deployments")
    assert resp_get.status_code == 200
    data = resp_get.json()["data"]
    assert any(d["id"] == dep_id for d in data)

def test_factory_reset(client, db_session):
    user, token = create_super_admin_and_token(db_session)
    client.cookies.set("access_token", token)
    
    req_data = {
        "confirm": "I_UNDERSTAND_THIS_IS_IRREVERSIBLE",
        "scope": ["executions", "projects", "users"]
    }
    
    resp = client.post("/api/v1/admin/infrastructure/factory-reset", json=req_data)
    assert resp.status_code == 200
    assert "Factory reset completed" in resp.json()["message"]
