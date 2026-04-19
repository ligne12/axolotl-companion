"""Application configuration via Pydantic Settings."""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-driven configuration.

    All fields can be overridden via environment variables or a ``.env`` file.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # -- General --------------------------------------------------------------
    env: Literal["development", "production", "test"] = "development"
    log_level: Literal["debug", "info", "warning", "error", "critical"] = "info"

    # -- Database -------------------------------------------------------------
    database_url: str = "postgresql+asyncpg://axolotl:axolotl@localhost:5432/axolotl"

    # -- Redis ----------------------------------------------------------------
    redis_url: str = "redis://localhost:6379/0"

    # -- Auth / Security ------------------------------------------------------
    jwt_secret: str = Field(..., min_length=32)
    jwt_algorithm: str = "HS256"
    jwt_access_expire_minutes: int = 15
    jwt_refresh_expire_days: int = 30
    fernet_key: str = Field(..., min_length=32)

    # -- CORS -----------------------------------------------------------------
    cors_origins: str = "http://localhost:3000"

    # -- LLM (vLLM) -----------------------------------------------------------
    # Defaults follow the Qwen3.5 "thinking mode" recipe.
    vllm_api_url: str = "http://localhost:8000/v1"
    vllm_served_model_name: str = "default"
    vllm_api_key: str = "EMPTY"
    vllm_temperature: float = 1.0
    vllm_top_p: float = 0.95
    vllm_top_k: int = 20
    vllm_min_p: float = 0.0
    vllm_presence_penalty: float = 1.5
    vllm_repetition_penalty: float = 1.0
    vllm_max_tokens: int = 8192
    vllm_enable_thinking: bool = True

    # -- Tool calling / agent -------------------------------------------------
    max_tool_rounds: int = 3
    web_search_max_results: int = 5
    web_search_timeout_seconds: float = 10.0

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse comma-separated CORS origins."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()
