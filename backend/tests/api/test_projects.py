import pytest
from fastapi.testclient import TestClient

@pytest.fixture
def test_user_token(client: TestClient) -> str:
    payload = {
        "first_name": "Test",
        "last_name": "User",
        "username": "testuser_projects",
        "email": "testuser_projects@example.com",
        "password": "Password123!"
    }
    client.post("/api/v1/auth/register", json=payload)
    login_resp = client.post("/api/v1/auth/login", json={"email": "testuser_projects@example.com", "password": "Password123!"})
    return login_resp.json()["data"]["access_token"]

def test_create_project(client: TestClient, test_user_token: str):
    cookies = {"access_token": test_user_token}
    response = client.post(
        "/api/v1/projects",
        cookies=cookies,
        json={
            "name": "Test Project",
            "description": "A project for testing",
            "language": "TypeScript",
            "visibility": "PRIVATE"
        }
    )
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["name"] == "Test Project"
    assert data["slug"] == "test-project"
    assert "id" in data
    


def test_get_projects(client: TestClient, test_user_token: str):
    cookies = {"access_token": test_user_token}
    
    # Create one to ensure it's there
    client.post("/api/v1/projects", cookies=cookies, json={"name": "P1"})
    
    response = client.get("/api/v1/projects", cookies=cookies)
    assert response.status_code == 200
    data = response.json()["data"]
    assert "items" in data
    assert "total" in data
    assert data["total"] > 0

def test_update_project(client: TestClient, test_user_token: str):
    cookies = {"access_token": test_user_token}
    
    # Create
    create_res = client.post("/api/v1/projects", cookies=cookies, json={"name": "P2"})
    p_id = create_res.json()["data"]["id"]
    
    # Update
    response = client.put(f"/api/v1/projects/{p_id}", cookies=cookies, json={"name": "P2 Updated", "color": "Blue"})
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["name"] == "P2 Updated"
    assert data["slug"] == "p2-updated"
    assert data["color"] == "Blue"

def test_soft_delete_and_restore(client: TestClient, test_user_token: str):
    cookies = {"access_token": test_user_token}
    
    # Create
    create_res = client.post("/api/v1/projects", cookies=cookies, json={"name": "To Delete"})
    p_id = create_res.json()["data"]["id"]
    
    # Delete
    del_res = client.delete(f"/api/v1/projects/{p_id}", cookies=cookies)
    assert del_res.status_code == 200
    assert del_res.json()["data"]["deleted_at"] is not None
    
    # Verify it doesn't appear in normal list
    list_res = client.get("/api/v1/projects", cookies=cookies)
    assert not any(p["id"] == p_id for p in list_res.json()["data"]["items"])
    
    # Verify it appears in trash
    trash_res = client.get("/api/v1/projects/trash", cookies=cookies)
    assert any(p["id"] == p_id for p in trash_res.json()["data"]["items"])
    
    # Restore
    rest_res = client.post(f"/api/v1/projects/{p_id}/restore", cookies=cookies)
    assert rest_res.status_code == 200
    assert rest_res.json()["data"]["deleted_at"] is None
