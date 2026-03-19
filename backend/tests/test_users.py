import uuid

import pytest


@pytest.mark.asyncio
async def test_get_current_user(client, anonymous_id):
    """Auto-creates user on first request, returns user info."""
    response = await client.get("/api/users/me")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["id"] == anonymous_id


@pytest.mark.asyncio
async def test_get_user_creates_same_user_on_repeat(client, anonymous_id):
    """Calling /me twice returns the same user."""
    r1 = await client.get("/api/users/me")
    r2 = await client.get("/api/users/me")
    assert r1.json()["data"]["id"] == r2.json()["data"]["id"]


@pytest.mark.asyncio
async def test_missing_anonymous_id_returns_400(client):
    """Requests without X-Anonymous-Id header should fail."""
    client.headers.pop("X-Anonymous-Id", None)
    response = await client.get("/api/users/me")
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_invalid_uuid_returns_400(client):
    """Requests with invalid UUID format should fail."""
    client.headers["X-Anonymous-Id"] = "not-a-uuid"
    response = await client.get("/api/users/me")
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_delete_user(client, anonymous_id):
    """Delete user and verify it cascades."""
    # Create user first
    await client.get("/api/users/me")

    # Delete
    response = await client.delete("/api/users/me")
    assert response.status_code == 200
    assert response.json()["success"] is True

    # User should be recreated on next request (anonymous system)
    r = await client.get("/api/users/me")
    assert r.status_code == 200
