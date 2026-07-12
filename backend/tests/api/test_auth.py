
def test_register_user_success(client):
    payload = {
        "first_name": "John",
        "last_name": "Doe",
        "username": "johndoe",
        "email": "johndoe@example.com",
        "password": "Password123!"
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["username"] == "johndoe"
    assert "id" in data["data"]
    assert "password_hash" not in data["data"]

def test_register_duplicate_email(client):
    payload = {
        "first_name": "John",
        "last_name": "Doe",
        "username": "johndoe",
        "email": "johndoe@example.com",
        "password": "Password123!"
    }
    client.post("/api/v1/auth/register", json=payload)
    
    payload["username"] = "johndoe2"
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409
    assert response.json()["message"] == "Email is already registered."

def test_register_duplicate_username(client):
    payload = {
        "first_name": "John",
        "last_name": "Doe",
        "username": "johndoe",
        "email": "johndoe@example.com",
        "password": "Password123!"
    }
    client.post("/api/v1/auth/register", json=payload)
    
    payload["email"] = "johndoe2@example.com"
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409
    assert response.json()["message"] == "Username is already taken."

def test_register_weak_password(client):
    payload = {
        "first_name": "John",
        "last_name": "Doe",
        "username": "weakpass",
        "email": "weak@example.com",
        "password": "password"
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 400
    assert "Password must be at least 8 characters" in response.json()["message"]

def test_login_success(client):
    payload = {
        "first_name": "John",
        "last_name": "Doe",
        "username": "johndoe",
        "email": "johndoe@example.com",
        "password": "Password123!"
    }
    client.post("/api/v1/auth/register", json=payload)
    
    login_payload = {
        "email": "johndoe@example.com",
        "password": "Password123!"
    }
    response = client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "access_token" in data["data"]
    assert "refresh_token" in data["data"]

def test_login_failure(client):
    payload = {
        "email": "johndoe@example.com",
        "password": "WrongPassword123!"
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    assert response.json()["message"] == "Invalid email or password."

def test_protected_route_success(client):
    payload = {
        "first_name": "John",
        "last_name": "Doe",
        "username": "johndoe",
        "email": "johndoe@example.com",
        "password": "Password123!"
    }
    client.post("/api/v1/auth/register", json=payload)
    
    login_payload = {
        "email": "johndoe@example.com",
        "password": "Password123!"
    }
    login_resp = client.post("/api/v1/auth/login", json=login_payload)
    token = login_resp.json()["data"]["access_token"]
    
    # Access protected route
    response = client.get(
        "/api/v1/auth/me",
        cookies={"access_token": token}
    )
    assert response.status_code == 200
    assert response.json()["data"]["email"] == "johndoe@example.com"

def test_protected_route_unauthorized(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
