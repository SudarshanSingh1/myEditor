from fastapi.testclient import TestClient

def test_register_user(client: TestClient):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "StrongPassword1!",
            "first_name": "Test",
            "last_name": "User"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["username"] == "testuser"

def test_login_user(client: TestClient):
    # Register first
    client.post(
        "/api/v1/auth/register",
        json={
            "username": "loginuser",
            "email": "login@example.com",
            "password": "StrongPassword1!",
            "first_name": "Login",
            "last_name": "User"
        }
    )
    
    # Then login
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "login@example.com",
            "password": "StrongPassword1!"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "access_token" in data["data"]

def test_get_me(client: TestClient):
    # Register first
    reg_response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "meuser",
            "email": "me@example.com",
            "password": "StrongPassword1!",
            "first_name": "Me",
            "last_name": "User"
        }
    )
    
    # Login to get token
    login_res = client.post(
        "/api/v1/auth/login",
        json={
            "email": "me@example.com",
            "password": "StrongPassword1!"
        }
    )
    token = login_res.json()["data"]["access_token"]
    
    # Get profile
    response = client.get(
        "/api/v1/auth/me",
        cookies={"access_token": token}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["username"] == "meuser"
