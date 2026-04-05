from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve .env next to apps/api (not cwd) so keys load when uvicorn runs from any directory
_API_DIR = Path(__file__).resolve().parents[2]
_ENV_FILE = _API_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE) if _ENV_FILE.is_file() else None,
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    app_env: str = "development"
    debug: bool = True
    log_level: str = "INFO"

    # Gemini
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    gemini_fallback_model: str = "gemini-2.5-pro"

    # AWS Bedrock
    aws_bearer_token_bedrock: str = ""
    aws_region: str = "us-east-1"
    bedrock_model_id: str = "global.anthropic.claude-sonnet-4-5-20250929-v1:0"

    # Database
    database_url: str = "sqlite+aiosqlite:///./prismrx.db"

    # Feature flags
    enable_auth: bool = False
    enable_voice: bool = False
    enable_chat: bool = False

    # Limits
    max_source_docs: int = 12
    max_compare_policies: int = 3
    max_extraction_chars: int = 40000  # ~10k tokens for flash

    frontend_url: str = "http://localhost:3000"

    # Live policy crawler (optional). .env: TAVILY_API_KEY=... or tavily_api_key=...
    tavily_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("TAVILY_API_KEY", "tavily_api_key"),
    )
    brave_search_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("BRAVE_SEARCH_API_KEY", "brave_search_api_key"),
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
