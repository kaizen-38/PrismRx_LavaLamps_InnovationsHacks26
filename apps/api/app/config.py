"""Application configuration using Pydantic Settings."""

import os
from typing import Optional
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    APP_NAME: str = "PrismRx Backend"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = ENVIRONMENT == "development"

    # API Configuration
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/prismrx_dev"
    )
    DB_ECHO: bool = ENVIRONMENT == "development"
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10

    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    REDIS_ENABLED: bool = True

    # Storage
    STORAGE_PATH: str = os.getenv("STORAGE_PATH", "/data/policies")
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024  # 50MB

    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    # Authentication (optional for hackathon)
    AUTH0_DOMAIN: Optional[str] = os.getenv("AUTH0_DOMAIN")
    AUTH0_CLIENT_ID: Optional[str] = os.getenv("AUTH0_CLIENT_ID")
    AUTH0_CLIENT_SECRET: Optional[str] = os.getenv("AUTH0_CLIENT_SECRET")
    AUTH_ENABLED: bool = False  # Disabled for hackathon MVP

    # Google Cloud / Vertex AI (optional)
    GOOGLE_CLOUD_PROJECT: Optional[str] = os.getenv("GOOGLE_CLOUD_PROJECT")
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = os.getenv(
        "GOOGLE_APPLICATION_CREDENTIALS"
    )

    # Parser Configuration
    PDF_PARSER_TYPE: str = "pymupdf"  # pymupdf or pdfplumber
    PRESERVE_FORMATTING: bool = True
    MIN_CHAR_LENGTH: int = 10  # Minimum characters for a meaningful text chunk

    # API Configuration
    CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:8000"]

    class Config:
        """Pydantic config."""
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Create default settings instance
settings = get_settings()
