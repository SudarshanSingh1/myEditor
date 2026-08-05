import pytest
from fastapi.testclient import TestClient
from app.models.system_error import SystemError
from app.models.audit_log import AuditLog


@pytest.fixture
def admin_token(client: TestClient, db_session) -> str:
    from app.models.user import User, RoleEnum, StatusEnum

    user = db_session.query(User).filter(User.email == "admin_bulk@example.com").first()
    if not user:
        payload = {
            "first_name": "Admin",
            "last_name": "Bulk",
            "username": "admin_bulk",
            "email": "admin_bulk@example.com",
            "password": "Password123!",
        }
        client.post("/api/v1/auth/register", json=payload)
        user = (
            db_session.query(User)
            .filter(User.email == "admin_bulk@example.com")
            .first()
        )

    user.role = RoleEnum.OWNER
    user.status = StatusEnum.ACTIVE
    user.email_verified = True
    db_session.commit()

    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin_bulk@example.com", "password": "Password123!"},
    )
    return login_resp.cookies.get("access_token")


def test_bulk_delete_system_errors(client: TestClient, admin_token: str, db_session):
    cookies = {"access_token": admin_token}

    error1 = SystemError(
        message="Test Error 1",
        error_type="UNKNOWN",
        route="/test1",
        stack_trace="Traceback 1",
        browser="Chrome",
    )
    error2 = SystemError(
        message="Test Error 2",
        error_type="UNKNOWN",
        route="/test2",
        stack_trace="Traceback 2",
        browser="Firefox",
    )
    error3 = SystemError(
        message="Test Error 3",
        error_type="UNKNOWN",
        route="/test3",
        stack_trace="Traceback 3",
        browser="Safari",
    )
    db_session.add_all([error1, error2, error3])
    db_session.commit()

    error1_id = str(error1.id)
    error2_id = str(error2.id)
    error3_id = str(error3.id)

    resp = client.request(
        "DELETE", "/api/v1/admin/errors/bulk", json={"ids": []}, cookies=cookies
    )
    assert resp.status_code == 400

    resp = client.request(
        "DELETE",
        "/api/v1/admin/errors/bulk",
        json={"ids": [error1_id, error2_id]},
        cookies=cookies,
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["deleted_count"] == 2

    remaining = db_session.query(SystemError).all()
    remaining_ids = [str(r.id) for r in remaining]
    assert error1_id not in remaining_ids
    assert error2_id not in remaining_ids
    assert error3_id in remaining_ids

    audit = (
        db_session.query(AuditLog)
        .filter(AuditLog.action == "BULK_DELETE_SYSTEM_ERRORS")
        .order_by(AuditLog.created_at.desc())
        .first()
    )
    assert audit is not None
    assert audit.details["deleted_count"] == 2
