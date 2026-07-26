import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.models.user import User, RoleEnum, StatusEnum
from app.core.security import create_access_token
import uuid
import json

def create_test_user_and_token(db_session):
    user = User(
        id=uuid.uuid4(),
        email="ws_user@example.com",
        username="ws_user",
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

@patch("app.api.v1.execution_ws.ExecutionService")
def test_websocket_execution_missing_token(mock_exec_service, client):
    with client.websocket_connect("/api/v1/execution/ws") as websocket:
        data = websocket.receive_json()
        assert data["type"] == "error"
        assert "No token" in data["message"]

@patch("app.api.v1.execution_ws.ExecutionService")
def test_websocket_execution_valid_user(mock_exec_service, client, db_session):
    user, token = create_test_user_and_token(db_session)
    client.cookies.set("access_token", token)
    
    mock_instance = MagicMock()
    mock_exec_service.return_value = mock_instance
    
    async def mock_run_code(*args, **kwargs):
        pass
    mock_instance.run_code_interactive = MagicMock(side_effect=mock_run_code)
    
    with client.websocket_connect("/api/v1/execution/ws") as websocket:
        websocket.send_json({
            "mode": "execute",
            "projectId": str(uuid.uuid4()),
            "fileId": str(uuid.uuid4())
        })
        # The connection will stay open in a real scenario, but since our mock doesn't block, 
        # it will finish and close. Or the mock does nothing and it waits?
        # Actually our mock_run_code is an async function that just returns.
        pass
    
    assert mock_instance.run_code_interactive.called

@patch("app.api.v1.execution_ws.ExecutionService")
def test_websocket_execution_shell(mock_exec_service, client, db_session):
    user, token = create_test_user_and_token(db_session)
    client.cookies.set("access_token", token)
    
    mock_instance = MagicMock()
    mock_exec_service.return_value = mock_instance
    
    with client.websocket_connect("/api/v1/execution/ws") as websocket:
        websocket.send_json({
            "mode": "shell",
            "projectId": str(uuid.uuid4())
        })
    
    assert mock_instance.run_shell_interactive.called

@patch("app.api.v1.execution_ws.ExecutionService")
def test_websocket_execution_guest_code(mock_exec_service, client, db_session):
    user, token = create_test_user_and_token(db_session)
    client.cookies.set("access_token", token)
    
    mock_instance = MagicMock()
    mock_exec_service.return_value = mock_instance
    
    with client.websocket_connect("/api/v1/execution/ws") as websocket:
        websocket.send_json({
            "mode": "execute_guest",
            "content": "print(1)",
            "language": "python"
        })
    
    assert mock_instance.run_guest_code_interactive.called
