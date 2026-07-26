import pytest
from unittest.mock import patch, AsyncMock
from app.models.user import User, RoleEnum, StatusEnum
from app.models.oauth_account import OAuthAccount
from app.core.security import create_access_token
import uuid

def create_test_user_and_token(db_session):
    user = User(
        id=uuid.uuid4(),
        email="github_user@example.com",
        username="github_user",
        password_hash="hashed_password",
        role=RoleEnum.USER,
        email_verified=True,
        status=StatusEnum.ACTIVE
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    oauth_acc = OAuthAccount(
        user_id=user.id,
        provider="github",
        provider_account_id="github_123",
        access_token="test_gh_token"
    )
    db_session.add(oauth_acc)
    db_session.commit()
    
    token = create_access_token(user.id)
    return user, token

def create_test_user_no_github(db_session):
    user = User(
        id=uuid.uuid4(),
        email="nogithub_user@example.com",
        username="nogithub_user",
        password_hash="hashed_password",
        role=RoleEnum.USER,
        email_verified=True,
        status=StatusEnum.ACTIVE
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    token = create_access_token(user.id)
    return user, token

@patch("app.api.v1.github.GitHubService")
def test_list_repositories(mock_github_service_class, client, db_session):
    user, token = create_test_user_and_token(db_session)
    client.cookies.set("access_token", token)
    
    mock_service_instance = AsyncMock()
    mock_github_service_class.return_value = mock_service_instance
    mock_service_instance.list_repositories.return_value = [{"name": "repo1"}]
    
    resp = client.get("/api/v1/github/repos")
    assert resp.status_code == 200
    assert resp.json()["data"] == [{"name": "repo1"}]

def test_list_repositories_no_token(client, db_session):
    user, token = create_test_user_no_github(db_session)
    client.cookies.set("access_token", token)
    
    resp = client.get("/api/v1/github/repos")
    assert resp.status_code == 401
    assert "GitHub account not connected" in resp.text

@patch("app.api.v1.github.GitHubService")
def test_create_repository(mock_github_service_class, client, db_session):
    user, token = create_test_user_and_token(db_session)
    client.cookies.set("access_token", token)
    
    mock_service_instance = AsyncMock()
    mock_github_service_class.return_value = mock_service_instance
    mock_service_instance.create_repository.return_value = {"name": "new_repo"}
    
    req_data = {
        "name": "new_repo",
        "description": "A new repo",
        "private": True
    }
    
    resp = client.post("/api/v1/github/repos", json=req_data)
    assert resp.status_code == 200
    assert resp.json()["data"]["name"] == "new_repo"

def test_create_repository_no_name(client, db_session):
    user, token = create_test_user_and_token(db_session)
    client.cookies.set("access_token", token)
    
    req_data = {
        "description": "A new repo",
        "private": True
    }
    
    resp = client.post("/api/v1/github/repos", json=req_data)
    assert resp.status_code == 400
    assert "Repository name is required" in resp.text
