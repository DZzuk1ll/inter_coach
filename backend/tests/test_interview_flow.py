"""Integration tests for interview lifecycle: create → send messages → end."""

import uuid
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.project import Project


# ---- Helpers ----

MOCK_ANALYSIS_RESULT = {
    "overview": {
        "description": "电商平台后端",
        "language": "Python",
        "framework": "FastAPI",
        "architecture": "微服务",
    },
    "module_summaries": [
        {"module": "auth", "purpose": "用户认证模块"},
    ],
    "triangulation": {
        "matches": ["FastAPI 开发经验"],
        "exaggerations": [],
        "gaps": ["Kubernetes"],
        "highlights": ["完整的 CI/CD"],
    },
    "question_pool": [
        {
            "phase": 1,
            "question": "请介绍一下你的项目背景和目标",
            "intent": "验证项目理解",
            "expected_points": ["项目背景", "技术栈"],
            "followup_angles": ["为什么选这个技术栈"],
            "code_reference": {},
        },
        {
            "phase": 2,
            "question": "auth 模块的认证流程是怎么实现的？",
            "intent": "技术深挖",
            "expected_points": ["JWT", "中间件"],
            "followup_angles": ["token 刷新策略"],
            "code_reference": {"file": "auth/middleware.py"},
        },
    ],
    "code_context": {
        "auth/middleware.py": "async def verify_token(token: str): ...",
    },
}


@pytest_asyncio.fixture
async def completed_project(client, db_engine, anonymous_id):
    """Insert a project with completed analysis directly into DB."""
    session_factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        # Ensure user exists
        await client.get("/api/users/me")

        project = Project(
            id=uuid.uuid4(),
            user_id=uuid.UUID(anonymous_id),
            name="测试面试项目",
            source_type="github_url",
            source_ref="https://github.com/test/repo",
            resume_text="张三，3年 Python 后端开发，熟悉 FastAPI",
            jd_text="后端工程师，要求 Python 经验",
            analysis_status="completed",
            analysis_result=MOCK_ANALYSIS_RESULT,
        )
        session.add(project)
        await session.commit()
        return project


@pytest.fixture
def _mock_knowledge():
    """Mock knowledge service to avoid pgvector dependency."""
    with (
        patch(
            "app.services.interview_engine.search_for_questioning",
            new_callable=AsyncMock,
            return_value=["使用 STAR 方法追问"],
        ),
        patch(
            "app.services.interview_engine.search_for_evaluation",
            new_callable=AsyncMock,
            return_value=["评估维度：技术深度"],
        ),
    ):
        yield


@pytest.fixture
def _mock_llm():
    """Mock LLMClient to return predictable responses."""
    mock_client = AsyncMock()
    mock_client.chat = AsyncMock(return_value="你好，我是面试官。请先介绍一下你的项目。")
    mock_client.chat_json = AsyncMock(return_value={
        "evaluation": "充分",
        "decision": "next_question",
        "response": "很好，你的回答很清晰。接下来我想了解一下你的认证模块。",
        "new_phase": None,
    })

    with patch("app.api.interviews.LLMClient", return_value=mock_client):
        yield mock_client


# ---- Tests ----


@pytest.mark.asyncio
async def test_create_interview(client, completed_project, _mock_knowledge, _mock_llm):
    """Create an interview session for a completed project."""
    response = await client.post(f"/api/projects/{completed_project.id}/interviews")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["status"] == "in_progress"
    assert data["current_phase"] == 1
    assert len(data["messages"]) == 1
    assert data["messages"][0]["role"] == "interviewer"


@pytest.mark.asyncio
async def test_create_interview_incomplete_project(client, db_engine, anonymous_id):
    """Cannot create interview for a project with pending analysis."""
    session_factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        await client.get("/api/users/me")
        project = Project(
            id=uuid.uuid4(),
            user_id=uuid.UUID(anonymous_id),
            name="未完成项目",
            source_type="github_url",
            source_ref="https://github.com/test/repo",
            resume_text="简历",
            jd_text="JD",
            analysis_status="pending",
        )
        session.add(project)
        await session.commit()

        response = await client.post(f"/api/projects/{project.id}/interviews")
        assert response.status_code == 400


@pytest.mark.asyncio
async def test_send_message(client, completed_project, _mock_knowledge, _mock_llm):
    """Send a candidate message and receive interviewer response."""
    # Create interview
    create_resp = await client.post(f"/api/projects/{completed_project.id}/interviews")
    interview_id = create_resp.json()["data"]["id"]

    # Send message
    response = await client.post(
        f"/api/interviews/{interview_id}/messages",
        json={"content": "这个项目是一个电商平台的后端服务，使用 FastAPI 开发。"},
    )
    assert response.status_code == 200
    msg = response.json()["data"]
    assert msg["role"] == "interviewer"
    assert msg["content"]  # Non-empty response


@pytest.mark.asyncio
async def test_send_message_to_ended_interview(client, completed_project, _mock_knowledge, _mock_llm):
    """Cannot send messages to an ended interview."""
    create_resp = await client.post(f"/api/projects/{completed_project.id}/interviews")
    interview_id = create_resp.json()["data"]["id"]

    # End the interview
    with patch("app.api.interviews.generate_review_report", new_callable=AsyncMock, return_value={}):
        await client.post(f"/api/interviews/{interview_id}/end")

    # Try to send message
    response = await client.post(
        f"/api/interviews/{interview_id}/messages",
        json={"content": "还想问一个问题"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_end_interview(client, completed_project, _mock_knowledge, _mock_llm):
    """End an interview and verify status changes."""
    create_resp = await client.post(f"/api/projects/{completed_project.id}/interviews")
    interview_id = create_resp.json()["data"]["id"]

    with patch("app.api.interviews.generate_review_report", new_callable=AsyncMock, return_value={
        "overall_score": 7.5,
        "dimensions": [],
        "summary": "表现良好",
        "strengths": ["技术基础扎实"],
        "improvements": ["可以更深入"],
    }):
        response = await client.post(f"/api/interviews/{interview_id}/end")

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["status"] == "completed"


@pytest.mark.asyncio
async def test_interview_list_shows_created(client, completed_project, _mock_knowledge, _mock_llm):
    """Created interviews appear in the list."""
    await client.post(f"/api/projects/{completed_project.id}/interviews")

    response = await client.get("/api/interviews")
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data) == 1
    assert data[0]["project_name"] == "测试面试项目"


@pytest.mark.asyncio
async def test_interview_detail_includes_messages(client, completed_project, _mock_knowledge, _mock_llm):
    """Interview detail includes all messages."""
    create_resp = await client.post(f"/api/projects/{completed_project.id}/interviews")
    interview_id = create_resp.json()["data"]["id"]

    # Send a message
    await client.post(
        f"/api/interviews/{interview_id}/messages",
        json={"content": "我负责整个后端架构设计。"},
    )

    # Get detail
    response = await client.get(f"/api/interviews/{interview_id}")
    assert response.status_code == 200
    messages = response.json()["data"]["messages"]
    # Opening + candidate + interviewer response = 3 messages
    assert len(messages) == 3
    roles = [m["role"] for m in messages]
    assert roles == ["interviewer", "candidate", "interviewer"]


@pytest.mark.asyncio
async def test_other_user_cannot_access_interview(client, completed_project, _mock_knowledge, _mock_llm):
    """A different user cannot access another user's interview."""
    create_resp = await client.post(f"/api/projects/{completed_project.id}/interviews")
    interview_id = create_resp.json()["data"]["id"]

    # Switch user
    client.headers["X-Anonymous-Id"] = str(uuid.uuid4())
    response = await client.get(f"/api/interviews/{interview_id}")
    assert response.status_code == 404
