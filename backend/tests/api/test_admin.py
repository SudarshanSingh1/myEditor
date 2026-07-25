import pytest
import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from app.models.user import User, RoleEnum, StatusEnum
from app.models.project import Project
from app.models.execution_log import ExecutionLog, ExecutionStatus

@pytest.fixture
def admin_token(client: TestClient, db_session) -> str:
    payload = {
        "first_name": "Admin",
        "last_name": "User",
        "username": "adminuser_test",
        "email": "adminuser_test@example.com",
        "password": "Password123!"
    }
    client.post("/api/v1/auth/register", json=payload)
    
    # Make user OWNER in database
    user = db_session.query(User).filter(User.email == "adminuser_test@example.com").first()
    user.role = RoleEnum.OWNER
    user.status = StatusEnum.ACTIVE
    user.email_verified = True
    db_session.commit()
    
    login_resp = client.post("/api/v1/auth/login", json={"email": "adminuser_test@example.com", "password": "Password123!"})
    return login_resp.json()["data"]["access_token"]

def test_admin_dashboard(client: TestClient, admin_token: str):
    cookies = {"access_token": admin_token}
    endpoints = [
        "/api/v1/admin/dashboard",
        "/api/v1/admin/statistics",
        "/api/v1/admin/server",
        "/api/v1/admin/server/health"
    ]
    for ep in endpoints:
        resp = client.get(ep, cookies=cookies)
        assert resp.status_code == 200, f"Failed on GET {ep}: {resp.text}"

def test_admin_projects_and_details(client: TestClient, admin_token: str, db_session):
    cookies = {"access_token": admin_token}
    
    # Get user to own project
    user = db_session.query(User).filter(User.email == "adminuser_test@example.com").first()
    
    # Create an active project
    proj = Project(
        owner_id=user.id,
        name="Active Test Project",
        slug="active-test-project",
        description="Testing active project details",
        language="Python",
        visibility="PUBLIC"
    )
    db_session.add(proj)
    db_session.commit()
    db_session.refresh(proj)
    
    # Add an execution log to test duration_ms / execution_time_ms bug
    exec_log = ExecutionLog(
        user_id=user.id,
        project_id=proj.id,
        language="Python",
        status=ExecutionStatus.SUCCESS,
        execution_time_ms=125,
        compiler="python3",
        exit_code=0
    )
    db_session.add(exec_log)
    db_session.commit()
    
    # Test list projects
    resp = client.get("/api/v1/admin/projects", cookies=cookies)
    assert resp.status_code == 200, f"Failed on GET /admin/projects: {resp.text}"
    
    # Test project details (previously crashed with AttributeError on e.duration_ms)
    details_resp = client.get(f"/api/v1/admin/projects/{proj.id}/details", cookies=cookies)
    assert details_resp.status_code == 200, f"Failed on GET /admin/projects/{proj.id}/details: {details_resp.text}"
    data = details_resp.json()["data"]
    assert data["name"] == "Active Test Project"
    assert len(data["executions"]) == 1
    assert data["executions"][0]["duration_ms"] == 125

def test_admin_users(client: TestClient, admin_token: str, db_session):
    cookies = {"access_token": admin_token}
    user = db_session.query(User).filter(User.email == "adminuser_test@example.com").first()
    
    resp = client.get("/api/v1/admin/users", cookies=cookies)
    assert resp.status_code == 200, f"Failed on GET /admin/users: {resp.text}"
    
    details_resp = client.get(f"/api/v1/admin/users/{user.id}/details", cookies=cookies)
    assert details_resp.status_code == 200, f"Failed on GET /admin/users/details: {details_resp.text}"

def test_admin_analytics(client: TestClient, admin_token: str):
    cookies = {"access_token": admin_token}
    endpoints = [
        "/api/v1/admin/analytics/users-growth",
        "/api/v1/admin/analytics/dau",
        "/api/v1/admin/analytics/executions",
        "/api/v1/admin/analytics/master-timeline",
        "/api/v1/admin/analytics/languages",
        "/api/v1/admin/analytics/execution-status",
        "/api/v1/admin/analytics/feedback-ratings",
        "/api/v1/admin/analytics/feedback-resolution"
    ]
    for ep in endpoints:
        resp = client.get(ep, cookies=cookies)
        assert resp.status_code == 200, f"Failed on GET {ep}: {resp.text}"

def test_admin_executions_endpoints(client: TestClient, admin_token: str):
    cookies = {"access_token": admin_token}
    endpoints = [
        "/api/v1/admin/executions/dashboard",
        "/api/v1/admin/executions",
        "/api/v1/admin/executions/audit"
    ]
    for ep in endpoints:
        resp = client.get(ep, cookies=cookies)
        assert resp.status_code == 200, f"Failed on GET {ep}: {resp.text}"

def test_admin_system_endpoints(client: TestClient, admin_token: str):
    cookies = {"access_token": admin_token}
    endpoints = [
        "/api/v1/admin/system-settings",
        "/api/v1/admin/audit",
        "/api/v1/admin/feedback",
        "/api/v1/admin/errors",
        "/api/v1/admin/emails",
        "/api/v1/admin/maintenance"
    ]
    for ep in endpoints:
        resp = client.get(ep, cookies=cookies)
        assert resp.status_code == 200, f"Failed on GET {ep}: {resp.text}"

def test_admin_security_and_server(client: TestClient, admin_token: str):
    cookies = {"access_token": admin_token}
    endpoints = [
        "/api/v1/admin/security/dashboard",
        "/api/v1/admin/security/blocked-ips",
        "/api/v1/admin/server/workers"
    ]
    for ep in endpoints:
        resp = client.get(ep, cookies=cookies)
        assert resp.status_code == 200, f"Failed on GET {ep}: {resp.text}"

def test_admin_github_and_identity(client: TestClient, admin_token: str):
    cookies = {"access_token": admin_token}
    endpoints = [
        "/api/v1/admin/github/dashboard",
        "/api/v1/admin/github/repositories",
        "/api/v1/admin/reports/analytics",
        "/api/v1/admin/identity/dashboard",
        "/api/v1/admin/identity/sessions"
    ]
    for ep in endpoints:
        resp = client.get(ep, cookies=cookies)
        assert resp.status_code == 200, f"Failed on GET {ep}: {resp.text}"

def test_admin_platform_analytics(client: TestClient, admin_token: str):
    cookies = {"access_token": admin_token}
    endpoints = [
        "/api/v1/admin/analytics/compiler/charts",
        "/api/v1/admin/analytics/storage/dashboard",
        "/api/v1/admin/analytics/storage/charts",
        "/api/v1/admin/analytics/storage/largest-projects",
        "/api/v1/admin/analytics/storage/largest-users",
        "/api/v1/admin/database"
    ]
    for ep in endpoints:
        resp = client.get(ep, cookies=cookies)
        assert resp.status_code == 200, f"Failed on GET {ep}: {resp.text}"
