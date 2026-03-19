import uuid
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.compiler import compiles

from app.config import get_settings
from app.database import get_db_session
from app.dependencies import LLMConfig, get_llm_config
from app.main import app
from app.models.base import Base


# Use in-memory SQLite for tests
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


# Teach SQLite how to compile PostgreSQL JSONB type
@compiles(JSONB, "sqlite")
def _compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"


@pytest_asyncio.fixture
async def db_engine():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(db_engine):
    session_factory = async_sessionmaker(
        db_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with session_factory() as session:
        yield session


@pytest.fixture
def mock_llm_config():
    return LLMConfig(
        base_url="https://api.test.com/v1",
        api_key="sk-test-key",
        model="test-model",
    )


@pytest.fixture
def mock_llm_client():
    client = AsyncMock()
    client.chat = AsyncMock(return_value="Mock LLM response")
    client.chat_json = AsyncMock(return_value={
        "evaluation": "充分",
        "decision": "next_question",
        "response": "Mock interviewer response",
        "new_phase": None,
    })
    return client


@pytest.fixture
def anonymous_id():
    return str(uuid.uuid4())


@pytest_asyncio.fixture
async def client(db_engine, mock_llm_config, anonymous_id):
    """Async test client with overridden dependencies."""
    session_factory = async_sessionmaker(
        db_engine, class_=AsyncSession, expire_on_commit=False
    )

    async def override_get_db():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    def override_get_llm_config():
        return mock_llm_config

    app.dependency_overrides[get_db_session] = override_get_db
    app.dependency_overrides[get_llm_config] = override_get_llm_config

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        ac.headers["X-Anonymous-Id"] = anonymous_id
        yield ac

    app.dependency_overrides.clear()
