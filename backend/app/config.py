from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

import yaml


@dataclass
class DatabaseConfig:
    url: str = "postgresql+asyncpg://interview_coach:password@localhost:5433/interview_coach"


@dataclass
class EmbeddingConfig:
    base_url: str = "https://api.siliconflow.cn/v1"
    api_key: str = ""
    model: str = "BAAI/bge-large-zh-v1.5"


@dataclass
class GitHubConfig:
    token: str = ""


@dataclass
class AppConfig:
    secret_key: str = "change-me"
    max_zip_size_mb: int = 50
    temp_dir: str = "/tmp/interview_coach"
    cors_origins: list[str] | None = None


@dataclass
class DefaultLLMConfig:
    base_url: str = ""
    api_key: str = ""
    model: str = ""


@dataclass
class Settings:
    database: DatabaseConfig = field(default_factory=DatabaseConfig)
    embedding: EmbeddingConfig = field(default_factory=EmbeddingConfig)
    github: GitHubConfig = field(default_factory=GitHubConfig)
    app: AppConfig = field(default_factory=AppConfig)
    llm: DefaultLLMConfig = field(default_factory=DefaultLLMConfig)


def _load_yaml_config() -> dict:
    config_path = Path(__file__).resolve().parent.parent.parent / "config.yaml"
    if not config_path.exists():
        return {}
    with open(config_path) as f:
        return yaml.safe_load(f) or {}


@lru_cache
def get_settings() -> Settings:
    raw = _load_yaml_config()
    return Settings(
        database=DatabaseConfig(**raw.get("database", {})),
        embedding=EmbeddingConfig(**raw.get("embedding", {})),
        github=GitHubConfig(**raw.get("github", {})),
        app=AppConfig(**raw.get("app", {})),
        llm=DefaultLLMConfig(**raw.get("llm", {})),
    )
