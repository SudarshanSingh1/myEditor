from app.models.user import User, RoleEnum, StatusEnum
from app.models.report import Report, ReportStatus, ReportTargetType
from app.core.security import create_access_token
import uuid


def create_admin_user_and_token(db_session):
    user = User(
        id=uuid.uuid4(),
        email="owner_reports@example.com",
        username="owner_reports",
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


def test_reports_crud(client, db_session):
    user, token = create_admin_user_and_token(db_session)
    client.cookies.set("access_token", token)

    # Create a mock report directly in DB for testing
    report = Report(
        id=str(uuid.uuid4()),
        reporter_id=user.id,
        target_type=ReportTargetType.USER,
        target_id=str(uuid.uuid4()),
        reason="Spam",
        status=ReportStatus.PENDING,
    )
    db_session.add(report)
    db_session.commit()

    # 1. List reports
    resp = client.get("/api/v1/admin/reports/")
    assert resp.status_code == 200
    assert len(resp.json()["data"]["items"]) == 1

    # 2. Analytics
    resp = client.get("/api/v1/admin/reports/analytics")
    assert resp.status_code == 200
    resp_json = resp.json()
    print("Analytics response:", resp_json)
    assert resp_json["data"]["total"] == 1
    assert resp.json()["data"]["pending"] == 1

    # 3. Assign
    resp = client.post(f"/api/v1/admin/reports/{report.id}/assign")
    assert resp.status_code == 200

    # Verify assignment
    resp = client.get(f"/api/v1/admin/reports/?status={ReportStatus.IN_PROGRESS.value}")
    assert len(resp.json()["data"]["items"]) == 1

    # 4. Resolve
    resp = client.post(f"/api/v1/admin/reports/{report.id}/resolve")
    assert resp.status_code == 200

    resp = client.get(f"/api/v1/admin/reports/?status={ReportStatus.RESOLVED.value}")
    assert len(resp.json()["data"]["items"]) == 1

    # 5. Reject
    resp = client.post(f"/api/v1/admin/reports/{report.id}/reject")
    assert resp.status_code == 200

    resp = client.get(f"/api/v1/admin/reports/?status={ReportStatus.REJECTED.value}")
    assert len(resp.json()["data"]["items"]) == 1
