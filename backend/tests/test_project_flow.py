"""Integration tests for project lifecycle: create → status → list → detail → delete."""

import uuid
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.project import Project


@pytest.fixture
def _mock_analysis():
    """Patch run_analysis_task so it doesn't actually run."""
    with patch("app.api.projects.run_analysis_task", new_callable=AsyncMock):
        yield


@pytest.fixture
def _mock_pdf():
    """Patch PDF extraction to return dummy text."""
    with patch(
        "app.api.projects.extract_text_from_pdf",
        new_callable=AsyncMock,
        return_value="张三\n软件工程师\n项目经验：电商平台后端开发",
    ):
        yield


@pytest.mark.asyncio
async def test_create_project_github(client, _mock_analysis, _mock_pdf):
    """Create a project with GitHub URL source."""
    response = await client.post(
        "/api/projects",
        data={
            "name": "测试项目",
            "source_type": "github_url",
            "github_url": "https://github.com/test/repo",
            "jd_text": "后端工程师，要求 Python 经验",
        },
        files={"resume_file": ("resume.pdf", b"%PDF-1.4 fake content", "application/pdf")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["name"] == "测试项目"
    assert data["data"]["source_type"] == "github_url"
    assert data["data"]["analysis_status"] == "pending"


@pytest.mark.asyncio
async def test_create_project_missing_github_url(client, _mock_analysis, _mock_pdf):
    """Should fail when source_type is github_url but no URL provided."""
    response = await client.post(
        "/api/projects",
        data={
            "name": "测试项目",
            "source_type": "github_url",
            "jd_text": "JD text",
        },
        files={"resume_file": ("resume.pdf", b"%PDF-1.4 fake", "application/pdf")},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_create_project_invalid_source_type(client, _mock_analysis, _mock_pdf):
    """Should fail with invalid source_type."""
    response = await client.post(
        "/api/projects",
        data={
            "name": "测试项目",
            "source_type": "invalid",
            "jd_text": "JD text",
        },
        files={"resume_file": ("resume.pdf", b"%PDF-1.4 fake", "application/pdf")},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_list_projects_returns_created(client, _mock_analysis, _mock_pdf):
    """After creating a project, it appears in the list."""
    await client.post(
        "/api/projects",
        data={
            "name": "项目A",
            "source_type": "github_url",
            "github_url": "https://github.com/test/repo",
            "jd_text": "JD",
        },
        files={"resume_file": ("resume.pdf", b"%PDF-1.4 fake", "application/pdf")},
    )

    response = await client.get("/api/projects")
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]) == 1
    assert data["data"][0]["name"] == "项目A"


@pytest.mark.asyncio
async def test_get_project_detail(client, _mock_analysis, _mock_pdf):
    """Get detail for a specific project."""
    create_resp = await client.post(
        "/api/projects",
        data={
            "name": "详情项目",
            "source_type": "github_url",
            "github_url": "https://github.com/test/repo",
            "jd_text": "JD",
        },
        files={"resume_file": ("resume.pdf", b"%PDF-1.4 fake", "application/pdf")},
    )
    project_id = create_resp.json()["data"]["id"]

    response = await client.get(f"/api/projects/{project_id}")
    assert response.status_code == 200
    assert response.json()["data"]["name"] == "详情项目"


@pytest.mark.asyncio
async def test_delete_project(client, _mock_analysis, _mock_pdf):
    """Delete a project and verify it's gone."""
    create_resp = await client.post(
        "/api/projects",
        data={
            "name": "待删除",
            "source_type": "github_url",
            "github_url": "https://github.com/test/repo",
            "jd_text": "JD",
        },
        files={"resume_file": ("resume.pdf", b"%PDF-1.4 fake", "application/pdf")},
    )
    project_id = create_resp.json()["data"]["id"]

    # Delete
    del_resp = await client.delete(f"/api/projects/{project_id}")
    assert del_resp.status_code == 200

    # Verify gone
    get_resp = await client.get(f"/api/projects/{project_id}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_analysis_status_pending(client, _mock_analysis, _mock_pdf):
    """Newly created project should have pending analysis status."""
    create_resp = await client.post(
        "/api/projects",
        data={
            "name": "状态项目",
            "source_type": "github_url",
            "github_url": "https://github.com/test/repo",
            "jd_text": "JD",
        },
        files={"resume_file": ("resume.pdf", b"%PDF-1.4 fake", "application/pdf")},
    )
    project_id = create_resp.json()["data"]["id"]

    response = await client.get(f"/api/projects/{project_id}/analysis-status")
    assert response.status_code == 200
    status_data = response.json()["data"]
    assert status_data["status"] == "pending"
    assert status_data["progress"] == 5


@pytest.mark.asyncio
async def test_other_user_cannot_access_project(client, _mock_analysis, _mock_pdf):
    """A different anonymous user cannot access another user's project."""
    create_resp = await client.post(
        "/api/projects",
        data={
            "name": "隐私项目",
            "source_type": "github_url",
            "github_url": "https://github.com/test/repo",
            "jd_text": "JD",
        },
        files={"resume_file": ("resume.pdf", b"%PDF-1.4 fake", "application/pdf")},
    )
    project_id = create_resp.json()["data"]["id"]

    # Switch to a different user
    client.headers["X-Anonymous-Id"] = str(uuid.uuid4())
    response = await client.get(f"/api/projects/{project_id}")
    assert response.status_code == 404
