import uuid
from dataclasses import dataclass

from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.models.user import User
from app.services.user_service import get_or_create_user


@dataclass
class LLMConfig:
    base_url: str
    api_key: str
    model: str


async def get_anonymous_user(
    request: Request,
    db: AsyncSession = Depends(get_db_session),
) -> User:
    anonymous_id = request.headers.get("X-Anonymous-Id")
    if not anonymous_id:
        raise HTTPException(status_code=400, detail="Missing X-Anonymous-Id header")

    try:
        user_uuid = uuid.UUID(anonymous_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")

    return await get_or_create_user(db, user_uuid)


def get_llm_config(request: Request) -> LLMConfig:
    base_url = request.headers.get("X-LLM-Base-URL")
    api_key = request.headers.get("X-LLM-API-Key")
    model = request.headers.get("X-LLM-Model")

    if not any([base_url, api_key, model]):
        raise HTTPException(
            status_code=400,
            detail="请先在设置页配置 LLM API（Base URL、API Key、Model）",
        )

    if not all([base_url, api_key, model]):
        missing = []
        if not base_url:
            missing.append("X-LLM-Base-URL")
        if not api_key:
            missing.append("X-LLM-API-Key")
        if not model:
            missing.append("X-LLM-Model")
        raise HTTPException(
            status_code=400,
            detail=f"Missing LLM config headers: {', '.join(missing)}",
        )

    return LLMConfig(base_url=base_url, api_key=api_key, model=model)
