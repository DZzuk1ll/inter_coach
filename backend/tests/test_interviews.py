import uuid

import pytest


@pytest.mark.asyncio
async def test_list_interviews_empty(client):
    response = await client.get("/api/interviews")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"] == []


@pytest.mark.asyncio
async def test_get_nonexistent_interview(client):
    fake_id = str(uuid.uuid4())
    response = await client.get(f"/api/interviews/{fake_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_create_interview_nonexistent_project(client):
    fake_id = str(uuid.uuid4())
    response = await client.post(f"/api/projects/{fake_id}/interviews")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_send_message_nonexistent_interview(client):
    fake_id = str(uuid.uuid4())
    response = await client.post(
        f"/api/interviews/{fake_id}/messages",
        json={"content": "test"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_end_nonexistent_interview(client):
    fake_id = str(uuid.uuid4())
    response = await client.post(f"/api/interviews/{fake_id}/end")
    assert response.status_code == 404
