import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import os
import sys

# Ensure backend root is in PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app as fastapi_app
from app.dependencies.database import get_db
from app.database.base import Base
import app.models

# Setup database for testing (use env var if present, fallback to sqlite)
SQLALCHEMY_DATABASE_URL = os.getenv("TEST_DATABASE_URL", os.getenv("DATABASE_URL", "sqlite:///:memory:"))

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Monkeypatch SessionLocal so middleware uses the in-memory test DB
import app.database.session
app.database.session.SessionLocal = TestingSessionLocal

@pytest.fixture(autouse=True)
def setup_database():
    # Create tables
    Base.metadata.create_all(bind=engine)
    yield
    # Drop tables
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session():
    """Returns an sqlalchemy session, and after the test tears down everything properly."""
    session = TestingSessionLocal()
    yield session
    session.close()

@pytest.fixture
def client(db_session):
    """Returns a FastAPI TestClient that overrides the get_db dependency."""
    def override_get_db():
        yield db_session

    from app.core.rate_limit import limiter
    limiter.enabled = False
    
    fastapi_app.dependency_overrides[get_db] = override_get_db
    
    # Mock EmailService
    from unittest.mock import patch
    with patch('app.services.email_service.EmailService.send_verification_email'), \
         patch('app.services.email_service.EmailService.send_new_login_alert'), \
         patch('app.services.email_service.EmailService.send_password_reset_email'):
        with TestClient(fastapi_app) as test_client:
            yield test_client
            
    fastapi_app.dependency_overrides.clear()
    limiter.enabled = True
