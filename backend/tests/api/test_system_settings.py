def test_get_system_settings_public(client):
    # This endpoint creates the default settings if they don't exist
    resp = client.get("/api/v1/system-settings/")
    assert resp.status_code == 200
    data = resp.json()["data"]

    assert "maintenance_mode" in data
    assert "registration_enabled" in data
    assert data["maintenance_mode"] is False


def test_get_system_status(client, db_session):
    resp = client.get("/api/v1/system/status")
    assert resp.status_code == 200
    data = resp.json()["data"]

    assert "maintenance_enabled" in data
    assert "server_time" in data
    assert data["maintenance_enabled"] is False
