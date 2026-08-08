from unittest.mock import patch, MagicMock
from app.models.user import User, RoleEnum, StatusEnum
from app.core.security import create_access_token
import uuid


def create_test_user_and_token(db_session):
    user = User(
        id=uuid.uuid4(),
        email="ws_user@example.com",
        username="ws_user",
        password_hash="hashed_password",
        role=RoleEnum.USER,
        email_verified=True,
        status=StatusEnum.ACTIVE,
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
        websocket.send_json(
            {
                "mode": "execute",
                "projectId": str(uuid.uuid4()),
                "fileId": str(uuid.uuid4()),
            }
        )
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
        websocket.send_json({"mode": "shell", "projectId": str(uuid.uuid4())})

    assert mock_instance.run_shell_interactive.called


@patch("app.api.v1.execution_ws.ExecutionService")
def test_websocket_execution_guest_code(mock_exec_service, client, db_session):
    user, token = create_test_user_and_token(db_session)
    client.cookies.set("access_token", token)

    mock_instance = MagicMock()
    mock_exec_service.return_value = mock_instance

    with client.websocket_connect("/api/v1/execution/ws") as websocket:
        websocket.send_json(
            {"mode": "execute_guest", "content": "print(1)", "language": "python"}
        )

    assert mock_instance.run_guest_code_interactive.called

import asyncio
import pytest
from unittest.mock import AsyncMock
from app.api.v1.safe_websocket import SafeWebSocket
from fastapi import WebSocket

@pytest.mark.asyncio
async def test_safe_websocket_locking():
    mock_ws = MagicMock(spec=WebSocket)
    mock_ws.send_text = AsyncMock()
    mock_ws.send_json = AsyncMock()
    
    safe_ws = SafeWebSocket(mock_ws)
    
    # Run multiple sends concurrently
    await asyncio.gather(
        safe_ws.send_text("test1"),
        safe_ws.send_text("test2"),
        safe_ws.send_json({"test": 3}),
    )
    
    assert mock_ws.send_text.call_count == 2
    assert mock_ws.send_json.call_count == 1


@pytest.mark.asyncio
async def test_heartbeat_loop_cancellation():
    from app.api.v1.execution_ws import _heartbeat_loop
    mock_ws = MagicMock()
    mock_ws.send_json = AsyncMock()
    
    task = asyncio.create_task(_heartbeat_loop(mock_ws))
    
    # Let it run briefly
    await asyncio.sleep(0.1)
    
    # Cancel it
    task.cancel()
    
    # Should not raise CancelledError since _heartbeat_loop catches it
    await task
