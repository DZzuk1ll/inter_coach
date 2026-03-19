import json
from collections.abc import AsyncGenerator

import structlog
from openai import AsyncOpenAI

from app.dependencies import LLMConfig

log = structlog.get_logger()


class LLMError(Exception):
    pass


class LLMClient:
    def __init__(self, config: LLMConfig):
        self.config = config
        self.client = AsyncOpenAI(
            base_url=config.base_url,
            api_key=config.api_key,
        )

    async def chat(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ) -> str:
        try:
            response = await self.client.chat.completions.create(
                model=self.config.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            usage = response.usage
            await log.ainfo(
                "llm_call",
                model=self.config.model,
                prompt_tokens=usage.prompt_tokens if usage else 0,
                completion_tokens=usage.completion_tokens if usage else 0,
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            await log.aerror("llm_call_failed", error=str(e))
            raise LLMError(f"LLM call failed: {e}") from e

    async def chat_stream(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ) -> AsyncGenerator[str, None]:
        try:
            stream = await self.client.chat.completions.create(
                model=self.config.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta if chunk.choices else None
                if delta and delta.content:
                    yield delta.content
        except Exception as e:
            await log.aerror("llm_stream_failed", error=str(e))
            raise LLMError(f"LLM stream failed: {e}") from e

    async def chat_json(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 4000,
    ) -> dict:
        try:
            response = await self.client.chat.completions.create(
                model=self.config.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                response_format={"type": "json_object"},
            )
            usage = response.usage
            await log.ainfo(
                "llm_call_json",
                model=self.config.model,
                prompt_tokens=usage.prompt_tokens if usage else 0,
                completion_tokens=usage.completion_tokens if usage else 0,
            )
            content = response.choices[0].message.content or "{}"
            return json.loads(content)
        except json.JSONDecodeError as e:
            await log.aerror("llm_json_parse_failed", error=str(e))
            raise LLMError(f"Failed to parse LLM JSON response: {e}") from e
        except Exception as e:
            await log.aerror("llm_call_failed", error=str(e))
            raise LLMError(f"LLM call failed: {e}") from e
