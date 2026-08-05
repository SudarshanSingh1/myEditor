import pytest
from unittest.mock import patch, MagicMock
from app.models.user import User, RoleEnum, StatusEnum
from app.core.security import create_access_token
import uuid
import docker

def create_admin_user_and_token(db_session):
    user = User(
        id=uuid.uuid4(),
        email="owner_docker@example.com",
        username="owner_docker",
        password_hash="hashed",
        role=RoleEnum.OWNER,
        email_verified=True,
        status=StatusEnum.ACTIVE
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    token = create_access_token(user.id)
    return user, token

@pytest.fixture
def mock_docker():
    with patch("docker.from_env") as mock:
        client = MagicMock()
        mock.return_value = client
        
        # Mock container list
        container1 = MagicMock()
        container1.short_id = "abc1234"
        container1.name = "test_container"
        container1.image.tags = ["ubuntu:latest"]
        container1.status = "running"
        container1.attrs = {"Created": "2023-01-01T00:00:00Z", "State": {"Status": "running"}}
        
        client.containers.list.return_value = [container1]
        
        # Mock get container
        client.containers.get.return_value = container1
        container1.logs.return_value = b"test logs\n"
        
        yield client, container1

def test_list_containers(client, db_session, mock_docker):
    user, token = create_admin_user_and_token(db_session)
    client.cookies.set("access_token", token)
    
    resp = client.get("/api/v1/admin/docker/containers")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert len(data["data"]["items"]) == 1
    assert data["data"]["items"][0]["name"] == "test_container"

def test_docker_dashboard(client, db_session, mock_docker):
    user, token = create_admin_user_and_token(db_session)
    client.cookies.set("access_token", token)
    
    resp = client.get("/api/v1/admin/docker/dashboard")
    assert resp.status_code == 200
    data = resp.json()
    assert data["data"]["total"] == 1
    assert data["data"]["running"] == 1

def test_get_container_logs(client, db_session, mock_docker):
    user, token = create_admin_user_and_token(db_session)
    client.cookies.set("access_token", token)
    
    resp = client.get("/api/v1/admin/docker/containers/abc1234/logs")
    assert resp.status_code == 200
    data = resp.json()
    assert "test logs" in data["data"]["logs"]

def test_restart_container(client, db_session, mock_docker):
    user, token = create_admin_user_and_token(db_session)
    client.cookies.set("access_token", token)
    
    docker_client, container = mock_docker
    resp = client.post("/api/v1/admin/docker/containers/abc1234/restart")
    assert resp.status_code == 200
    container.restart.assert_called_once()

def test_stop_container(client, db_session, mock_docker):
    user, token = create_admin_user_and_token(db_session)
    client.cookies.set("access_token", token)
    
    docker_client, container = mock_docker
    resp = client.post("/api/v1/admin/docker/containers/abc1234/stop")
    assert resp.status_code == 200
    container.stop.assert_called_once()

def test_remove_container(client, db_session, mock_docker):
    user, token = create_admin_user_and_token(db_session)
    client.cookies.set("access_token", token)
    
    docker_client, container = mock_docker
    resp = client.delete("/api/v1/admin/docker/containers/abc1234")
    assert resp.status_code == 200
    container.remove.assert_called_once_with(force=True)

def test_container_not_found(client, db_session, mock_docker):
    user, token = create_admin_user_and_token(db_session)
    client.cookies.set("access_token", token)
    
    docker_client, container = mock_docker
    docker_client.containers.get.side_effect = docker.errors.NotFound("No such container")
    
    resp = client.get("/api/v1/admin/docker/containers/invalid/logs")
    assert resp.status_code == 404
