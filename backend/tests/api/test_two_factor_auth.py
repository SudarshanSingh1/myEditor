import pytest
from app.models.user import User, RoleEnum, StatusEnum
from app.core.security import create_access_token
import pyotp

def create_test_user_and_token(db_session):
    user = User(
        email="2fa_user@example.com",
        username="2fa_user",
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

def test_setup_2fa(client, db_session):
    user, token = create_test_user_and_token(db_session)
    headers = {"Authorization": f"Bearer {token}"}
    
    resp = client.post("/api/v1/security/2fa/setup", headers=headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "secret" in data
    assert "uri" in data
    
    # Try setting up again when already enabled
    user.totp_enabled = True
    db_session.commit()
    
    resp = client.post("/api/v1/security/2fa/setup", headers=headers)
    assert resp.status_code == 400
    assert "already enabled" in resp.text

def test_enable_2fa(client, db_session):
    user, token = create_test_user_and_token(db_session)
    headers = {"Authorization": f"Bearer {token}"}
    
    # Try enabling without setup
    resp = client.post("/api/v1/security/2fa/enable", headers=headers, json={"code": "123456"})
    assert resp.status_code == 400
    assert "not initialized" in resp.text
    
    # Setup
    secret = pyotp.random_base32()
    user.totp_secret = secret
    db_session.commit()
    
    # Invalid code
    resp = client.post("/api/v1/security/2fa/enable", headers=headers, json={"code": "000000"})
    assert resp.status_code == 400
    assert "Invalid 2FA code" in resp.text
    
    # Valid code
    totp = pyotp.TOTP(secret)
    valid_code = totp.now()
    
    resp = client.post("/api/v1/security/2fa/enable", headers=headers, json={"code": valid_code})
    assert resp.status_code == 200
    assert "recovery_codes" in resp.json()["data"]
    
    db_session.refresh(user)
    assert user.totp_enabled is True

def test_disable_2fa(client, db_session):
    user, token = create_test_user_and_token(db_session)
    headers = {"Authorization": f"Bearer {token}"}
    
    # Not enabled
    resp = client.post("/api/v1/security/2fa/disable", headers=headers, json={"code": "123456"})
    assert resp.status_code == 400
    assert "not enabled" in resp.text
    
    # Setup & Enable
    secret = pyotp.random_base32()
    user.totp_secret = secret
    user.totp_enabled = True
    db_session.commit()
    
    # Invalid code
    resp = client.post("/api/v1/security/2fa/disable", headers=headers, json={"code": "000000"})
    assert resp.status_code == 400
    
    # Valid code
    totp = pyotp.TOTP(secret)
    valid_code = totp.now()
    
    resp = client.post("/api/v1/security/2fa/disable", headers=headers, json={"code": valid_code})
    assert resp.status_code == 200
    
    db_session.refresh(user)
    assert user.totp_enabled is False
    assert user.totp_secret is None
