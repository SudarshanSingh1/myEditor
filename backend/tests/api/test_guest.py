import pytest
from app.models.guest_session import GuestSession
import datetime

def test_initialize_guest(client, db_session):
    # Initial request should create a new guest session
    resp = client.post("/api/v1/guest/init")
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "guest_id" in data
    
    # Verify DB
    import uuid
    session = db_session.query(GuestSession).filter(GuestSession.id == uuid.UUID(data["guest_id"])).first()
    assert session is not None
    assert session.execution_count == 0
    assert not session.is_converted
    
    # Second request from the same IP (or with the same token in cookie) should return the same session
    # We will simulate sending the token back
    token = data["access_token"]
    client.cookies.set("access_token", token)
    
    resp2 = client.post("/api/v1/guest/init")
    assert resp2.status_code == 200
    data2 = resp2.json()
    
    assert data2["guest_id"] == data["guest_id"]
    
    # Test without cookie, should rely on IP fallback
    client.cookies.delete("access_token")
    resp3 = client.post("/api/v1/guest/init")
    assert resp3.status_code == 200
    assert resp3.json()["guest_id"] == data["guest_id"]
