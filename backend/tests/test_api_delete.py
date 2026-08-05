from app.database.session import SessionLocal
from app.models.user import User
from app.models.project import Project
from fastapi.testclient import TestClient
from app.main import app
from app.dependencies.auth import require_super_admin

import pytest


@pytest.mark.skip(reason="Manual test script requiring live DB")
def test_api_delete_manual():
    db = SessionLocal()
    u = db.query(User).filter(User.username == "api_del_test").first()
    if u:
        try:
            db.delete(u)
            db.commit()
        except:
            db.rollback()

    u = User(username="api_del_test", email="apidel@test.com", password_hash="hash")
    db.add(u)
    db.commit()

    p = Project(name="proj", slug="proj-123456", owner_id=u.id)
    db.add(p)
    db.commit()

    admin = db.query(User).filter(User.username == "nhipta01").first()

    def mock_require_super_admin():
        return admin

    app.dependency_overrides[require_super_admin] = mock_require_super_admin
    client = TestClient(app)

    response = client.delete(f"/api/v1/admin/users/{u.id}")
    print("STATUS CODE:", response.status_code)
    print("RESPONSE JSON:", response.json())

    # Check DB
    u_after = db.query(User).filter(User.id == u.id).first()
    if u_after:
        print("USER IS STILL IN DB. is_deleted=", u_after.is_deleted)
    else:
        print("USER IS NOT IN DB (Hard Deleted)")
