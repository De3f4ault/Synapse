"""
Configuration management using Pydantic Settings.
Reads environment variables from .env file.
"""
from typing import List, Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    APP_NAME: str = Field(default="SYNAPSE", description="Application name")
    APP_VERSION: str = Field(default="1.0.0", description="Application version")
    ENVIRONMENT: str = Field(default="development", description="Environment: development, testing, production")

    # Database - PostgreSQL
    DATABASE_URL: str = Field(
        ...,
        description="PostgreSQL connection string (asyncpg driver)"
    )

    DATABASE_SCHEMA: str = Field(
        default="developer_schema",
        description="PostgreSQL schema name"
    )

    # Redis
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL"
    )

    # Vector Store - LanceDB
    LANCEDB_PATH: str = Field(
        default="data/lancedb",
        description="Path to LanceDB vector store"
    )

    # Analytics - DuckDB
    DUCKDB_PATH: str = Field(
        default="data/duckdb/analytics.duckdb",
        description="Path to DuckDB analytics database"
    )

    # Gemini API
    GEMINI_API_KEY: str = Field(
        ...,
        description="Google Gemini API key"
    )

    # JWT Authentication
    JWT_SECRET_KEY: str = Field(
        ...,
        description="Secret key for JWT token signing (min 64 chars)"
    )
    JWT_ALGORITHM: str = Field(
        default="HS256",
        description="JWT signing algorithm"
    )
    JWT_EXPIRATION_MINUTES: int = Field(
        default=60,
        description="JWT token expiration in minutes"
    )

    # CORS - All common development ports
    CORS_ORIGINS: List[str] = Field(
        default=[
            "http://localhost:3000",
            "http://localhost:8000",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:8000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        description="Allowed CORS origins"
    )

    # Logging
    LOG_LEVEL: str = Field(
        default="INFO",
        description="Logging level: DEBUG, INFO, WARNING, ERROR, CRITICAL"
    )

    # File Storage
    UPLOAD_DIR: str = Field(
        default="data/uploads",
        description="Directory for file uploads"
    )
    MAX_UPLOAD_SIZE: int = Field(
        default=100 * 1024 * 1024,  # 100MB
        description="Maximum file upload size in bytes"
    )

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = Field(
        default=True,
        description="Enable rate limiting"
    )
    RATE_LIMIT_REQUESTS: int = Field(
        default=100,
        description="Number of requests allowed per window"
    )
    RATE_LIMIT_WINDOW: int = Field(
        default=60,
        description="Rate limit window in seconds"
    )

    # Background Tasks
    BACKGROUND_TASKS_ENABLED: bool = Field(
        default=True,
        description="Enable background task processing"
    )
    BACKGROUND_WORKERS: int = Field(
        default=4,
        description="Number of background worker threads"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        """Ensure JWT secret key is strong enough."""
        if len(v) < 32:
            raise ValueError("JWT_SECRET_KEY must be at least 32 characters long")
        return v

    @field_validator("ENVIRONMENT")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        """Ensure environment is valid."""
        allowed = ["development", "testing", "production"]
        if v.lower() not in allowed:
            raise ValueError(f"ENVIRONMENT must be one of: {', '.join(allowed)}")
        return v.lower()

    @field_validator("LOG_LEVEL")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        """Ensure log level is valid."""
        allowed = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        v_upper = v.upper()
        if v_upper not in allowed:
            raise ValueError(f"LOG_LEVEL must be one of: {', '.join(allowed)}")
        return v_upper


# Singleton instance - import this throughout the application
settings = Settings()
