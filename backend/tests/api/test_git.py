import pytest
from unittest.mock import patch, MagicMock
from app.models.user import User, RoleEnum, StatusEnum
from app.models.project import Project
from app.models.oauth_account import OAuthAccount
from app.core.security import create_access_token
import uuid

def create_test_user_and_token(db_session):
    user = User(
        id=uuid.uuid4(),
        email="git_user@example.com",
        username="git_user",
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
        provider_account_id="gh_123",
        access_token="gh_test_token"
    )
    db_session.add(oauth_acc)
    db_session.commit()
    
    token = create_access_token(user.id)
    return user, token

@patch("app.api.v1.git.get_github_token")
@patch("app.api.v1.git.ProjectRepository")
@patch("app.api.v1.git.GitService")
def test_clone_repository(mock_git_service_class, mock_project_repo_class, mock_get_github_token, client, db_session):
    mock_get_github_token.return_value = "gh_token"
    
    user, token = create_test_user_and_token(db_session)
    client.cookies.set("access_token", token)
    
    project = Project(
        id=uuid.uuid4(),
        name="Test Project",
        slug="test-project",
        owner_id=user.id
    )
    db_session.add(project)
    db_session.commit()
    
    mock_repo_instance = MagicMock()
    mock_project_repo_class.return_value = mock_repo_instance
    mock_repo_instance.get_by_id.return_value = project
    
    mock_service_instance = MagicMock()
    mock_git_service_class.return_value = mock_service_instance
    mock_service_instance.clone_repository.return_value = None
    
    req_data = {
        "project_id": str(project.id),
        "repo_url": "https://github.com/test/repo",
        "branch": "main"
    }
    
    resp = client.post("/api/v1/git/clone", json=req_data)
    assert resp.status_code == 200
    assert "cloned successfully" in resp.json()["message"]
    
    db_session.refresh(project)
    assert project.github_repo_url == "https://github.com/test/repo"

@patch("app.api.v1.git.get_github_token")
@patch("app.api.v1.git.ProjectRepository")
@patch("app.api.v1.git.GitService")
def test_push_repository(mock_git_service_class, mock_project_repo_class, mock_get_github_token, client, db_session):
    mock_get_github_token.return_value = "gh_token"
    
    user, token = create_test_user_and_token(db_session)
    client.cookies.set("access_token", token)
    
    project = Project(
        id=uuid.uuid4(),
        name="Test Project",
        slug="test-project",
        owner_id=user.id,
        github_repo_url="https://github.com/test/repo"
    )
    db_session.add(project)
    db_session.commit()
    
    mock_repo_instance = MagicMock()
    mock_project_repo_class.return_value = mock_repo_instance
    mock_repo_instance.get_by_id.return_value = project
    
    mock_service_instance = MagicMock()
    mock_git_service_class.return_value = mock_service_instance
    mock_service_instance.push_to_repository.return_value = {"commit": "sha123"}
    
    req_data = {
        "project_id": str(project.id),
        "message": "Initial commit"
    }
    
    resp = client.post("/api/v1/git/push", json=req_data)
    assert resp.status_code == 200
    assert "Pushed successfully" in resp.json()["message"]
