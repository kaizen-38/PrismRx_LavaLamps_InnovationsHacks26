from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_env: str = "development"
    debug: bool = True
    log_level: str = "INFO"

    # Gemini
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    gemini_fallback_model: str = "gemini-2.5-pro"

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

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
