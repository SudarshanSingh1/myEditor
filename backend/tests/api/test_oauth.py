import pytest
from unittest.mock import patch, AsyncMock
from app.core.config import settings
import uuid
from app.models.user import User

def test_google_authorize(client):
    settings.GOOGLE_CLIENT_ID = "test_google_id"
    settings.GOOGLE_CLIENT_SECRET = "test_google_secret"
    resp = client.get("/api/v1/auth/oauth/google/authorize", follow_redirects=False)
    assert resp.status_code == 307
    assert "accounts.google.com" in resp.headers["location"]

def test_github_authorize(client):
    settings.GITHUB_CLIENT_ID = "test_github_id"
    settings.GITHUB_CLIENT_SECRET = "test_github_secret"
    resp = client.get("/api/v1/auth/oauth/github/authorize", follow_redirects=False)
    assert resp.status_code == 307
    assert "github.com/login/oauth" in resp.headers["location"]

def test_generic_authorize(client):
    settings.GOOGLE_CLIENT_ID = "test_google_id"
    settings.GOOGLE_CLIENT_SECRET = "test_google_secret"
    resp = client.get("/api/v1/auth/oauth/google/authorize", follow_redirects=False)
    assert resp.status_code == 307

@patch("app.api.v1.oauth._exchange_github")
def test_github_callback(mock_exchange, client, db_session):
    mock_exchange.return_value = (
        "gh_user@example.com",
        "gh_123",
        "GH User",
        "avatar_url",
        "gh_access",
        "gh_refresh"
    )
    
    req_data = {"code": "test_code"}
    resp = client.post("/api/v1/auth/oauth/github/callback", json=req_data)
    assert resp.status_code == 200
    assert "access_token" in resp.cookies
    assert "refresh_token" in resp.cookies
    
    # Check DB
    user = db_session.query(User).filter(User.email == "gh_user@example.com").first()
    assert user is not None
    assert user.email == "gh_user@example.com"
    
@patch("app.api.v1.oauth._exchange_google")
def test_google_callback(mock_exchange, client, db_session):
    mock_exchange.return_value = (
        "google_user@example.com",
        "google_123",
        "Google User",
        "avatar_url",
        "google_access",
        "google_refresh"
    )
    
    req_data = {"code": "test_code"}
    resp = client.post("/api/v1/auth/oauth/google/callback", json=req_data)
    assert resp.status_code == 200
    assert "access_token" in resp.cookies
    
    # Check DB
    user = db_session.query(User).filter(User.email == "google_user@example.com").first()
    assert user is not None
    assert user.email == "google_user@example.com"
