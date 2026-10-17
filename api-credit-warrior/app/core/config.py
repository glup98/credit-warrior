import os
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def _resolve_database_url() -> str:
    """Resolve DATABASE_URL from environment without hardcoding production credentials."""
    env_url = os.getenv("DATABASE_URL")
    if env_url:
        return env_url
    # Safe local loopback default for development/unit-testing only (binds to 127.0.0.1)
    return "sqlite+pysqlite:///:memory:"


class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = Field(default="Credit Warrior API", alias="APP_NAME")
    app_env: str = Field(default="development", alias="APP_ENV")
    debug: bool = Field(default=False, alias="DEBUG")

    # Server MUST listen on 127.0.0.1 during local development and testing
    host: str = Field(default="127.0.0.1", alias="HOST")
    port: int = Field(default=8000, alias="PORT")

    allowed_origins: list[str] = Field(
        default=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        alias="ALLOWED_ORIGINS",
    )

    database_url: str = Field(default_factory=_resolve_database_url, alias="DATABASE_URL")

    # Database connection pool configuration with fail-fast validation
    db_pool_size: int = Field(default=10, alias="DB_POOL_SIZE", ge=1)
    db_max_overflow: int = Field(default=20, alias="DB_MAX_OVERFLOW", ge=0)
    db_pool_recycle: int = Field(default=1800, alias="DB_POOL_RECYCLE", ge=1)
    db_pool_timeout: int = Field(default=30, alias="DB_POOL_TIMEOUT", ge=1)



@lru_cache
def get_settings() -> Settings:
    return Settings()
