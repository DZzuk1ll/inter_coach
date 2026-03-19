import uuid
from dataclasses import dataclass

from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
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

    # If all headers are missing, fall back to config.yaml defaults
    if not any([base_url, api_key, model]):
        settings = get_settings()
        default = settings.llm
        if all([default.base_url, default.api_key, default.model]):
            return LLMConfig(
                base_url=default.base_url,
                api_key=default.api_key,
                model=default.model,
            )
        raise HTTPException(
            status_code=400,
            detail="请先在设置页配置 LLM API（Base URL、API Key、Model）",
        )

    # Partial headers provided — fill gaps from config.yaml
    settings = get_settings()
    default = settings.llm
    base_url = base_url or default.base_url
    api_key = api_key or default.api_key
    model = model or default.model

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
