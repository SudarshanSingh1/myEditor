import pytest
from unittest.mock import patch, MagicMock
from app.models.user import User, RoleEnum, StatusEnum
from app.core.security import create_access_token
import uuid

def create_test_user_and_token(db_session):
    user = User(
        id=uuid.uuid4(),
        email="exec_user@example.com",
        username="exec_user",
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

@patch("app.api.v1.execution.ExecutionService")
def test_run_code_success(mock_execution_service_class, client, db_session):
    mock_service_instance = MagicMock()
    mock_execution_service_class.return_value = mock_service_instance
    
    mock_service_instance.run_code.return_value = {
        "language": "python",
        "compile_time_ms": 0,
        "execution_time_ms": 15,
        "memory_used_kb": 1024,
        "exit_code": 0,
        "output": "Hello, World!\n",
        "status": "success"
    }

    user, token = create_test_user_and_token(db_session)
    client.cookies.set("access_token", token)
    
    req_data = {
        "project_id": str(uuid.uuid4()),
        "file_id": str(uuid.uuid4()),
        "language": "python",
        "input": ""
    }
    
    resp = client.post("/api/v1/execution/run", json=req_data)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["language"] == "python"
    assert data["output"] == "Hello, World!\n"

@patch("app.api.v1.execution.ExecutionService")
def test_run_code_error(mock_execution_service_class, client, db_session):
    mock_service_instance = MagicMock()
    mock_execution_service_class.return_value = mock_service_instance
    
    mock_service_instance.run_code.side_effect = ValueError("Language not supported")

    user, token = create_test_user_and_token(db_session)
    client.cookies.set("access_token", token)
    
    req_data = {
        "project_id": str(uuid.uuid4()),
        "file_id": str(uuid.uuid4()),
        "language": "unsupported",
        "input": ""
    }
    
    resp = client.post("/api/v1/execution/run", json=req_data)
    assert resp.status_code == 400
    assert "Language not supported" in resp.text

@patch("app.api.v1.execution.ExecutionService")
def test_stop_execution(mock_execution_service_class, client, db_session):
    mock_service_instance = MagicMock()
    mock_execution_service_class.return_value = mock_service_instance
    
    mock_service_instance.stop_execution.return_value = None

    user, token = create_test_user_and_token(db_session)
    client.cookies.set("access_token", token)
    
    resp = client.post("/api/v1/execution/run/stop?container_id=test_123")
    assert resp.status_code == 200
    assert "Execution stopped" in resp.text
