import pytest


@pytest.mark.asyncio
async def test_list_projects_empty(client):
    response = await client.get("/api/projects")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"] == []


@pytest.mark.asyncio
async def test_get_nonexistent_project(client):
    import uuid
    fake_id = str(uuid.uuid4())
    response = await client.get(f"/api/projects/{fake_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_nonexistent_project(client):
    import uuid
    fake_id = str(uuid.uuid4())
    response = await client.delete(f"/api/projects/{fake_id}")
    assert response.status_code == 404
