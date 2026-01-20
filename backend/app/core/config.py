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
    ENVIRONMENT: str = Field(
        default="development", description="Environment: development, testing, production"
    )

    # Database - PostgreSQL
    DATABASE_URL: str = Field(..., description="PostgreSQL connection string (asyncpg driver)")

    DATABASE_SCHEMA: str = Field(default="developer_schema", description="PostgreSQL schema name")

    # Redis
    REDIS_URL: str = Field(default="redis://localhost:6379/0", description="Redis connection URL")

    # Vector Store - LanceDB
    LANCEDB_PATH: str = Field(default="data/lancedb", description="Path to LanceDB vector store")

    # NOTE: DuckDB removed - Analytics now uses PostgreSQL materialized views
    # See: app/sql/views/user_dashboard_stats.sql

    # Gemini API
    GEMINI_API_KEY: str = Field(..., description="Google Gemini API key")

    # Ollama (Cognitive Router)
    OLLAMA_BASE_URL: str = Field(
        default="http://localhost:11434",
        description="Ollama API base URL (local or cloud)",
    )
    OLLAMA_API_KEY: Optional[str] = Field(
        default=None,
        description="Ollama Cloud API key (optional, for cloud only)",
    )
    OLLAMA_TIMEOUT: int = Field(
        default=120,
        description="Ollama request timeout in seconds",
    )

    # JWT Authentication
    JWT_SECRET_KEY: str = Field(..., description="Secret key for JWT token signing (min 64 chars)")
    JWT_ALGORITHM: str = Field(default="HS256", description="JWT signing algorithm")
    JWT_EXPIRATION_MINUTES: int = Field(default=60, description="JWT token expiration in minutes")

    # CORS - All common development ports + HTTPS for nginx reverse proxy
    CORS_ORIGINS: List[str] = Field(
        default=[
            # HTTP development servers
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:3002",
            "http://localhost:8000",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
            "http://127.0.0.1:3002",
            "http://127.0.0.1:8000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            # HTTPS (nginx reverse proxy)
            "https://localhost",
            "https://127.0.0.1",
            "https://synapse.local",
        ],
        description="Allowed CORS origins",
    )

    # Logging
    LOG_LEVEL: str = Field(
        default="INFO", description="Logging level: DEBUG, INFO, WARNING, ERROR, CRITICAL"
    )

    # File Storage
    UPLOAD_DIR: str = Field(default="data/uploads", description="Directory for file uploads")
    MAX_UPLOAD_SIZE: int = Field(
        default=100 * 1024 * 1024,  # 100MB
        description="Maximum file upload size in bytes",
    )

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = Field(default=True, description="Enable rate limiting")
    RATE_LIMIT_REQUESTS: int = Field(
        default=100, description="Number of requests allowed per window"
    )
    RATE_LIMIT_WINDOW: int = Field(default=60, description="Rate limit window in seconds")

    # Background Tasks
    BACKGROUND_TASKS_ENABLED: bool = Field(
        default=True, description="Enable background task processing"
    )
    BACKGROUND_WORKERS: int = Field(default=4, description="Number of background worker threads")

    # Webhooks
    WEBHOOK_ENCRYPTION_KEY: Optional[str] = Field(
        default=None,
        description="Fernet encryption key for webhook secrets (required in production)",
    )
    WEBHOOK_ENCRYPTION_ROTATION_KEYS: Optional[str] = Field(
        default=None, description="Comma-separated list of old encryption keys for rotation"
    )
    WEBHOOK_MAX_RETRIES: int = Field(
        default=5, description="Maximum webhook delivery retry attempts"
    )
    WEBHOOK_BACKOFF_MAX: int = Field(
        default=3600, description="Maximum backoff delay in seconds (default: 1 hour)"
    )
    WEBHOOK_TIMEOUT: int = Field(default=10, description="Webhook HTTP request timeout in seconds")

    # Phase 3B.1 - Adaptive Ranking (DISABLED BY DEFAULT)
    ENABLE_ADAPTIVE_RANKING: bool = Field(
        default=False,
        description="Enable Phase 3B.1 adaptive ranking weights (PRODUCTION: require explicit opt-in)",
    )
    ADAPTIVE_RANKING_SHADOW_MODE: bool = Field(
        default=True,
        description="Shadow mode: log weight applications without affecting results",
    )
    ADAPTIVE_RANKING_WEIGHT_MULTIPLIER: float = Field(
        default=1.05,
        description="Default boost multiplier for trusted evidence (1.05 = 5% boost)",
    )
    ADAPTIVE_RANKING_TTL_DAYS: int = Field(
        default=10,
        description="Days until ranking weights expire",
    )

    # ========================================================================
    # LEARNING LEDGER FEATURE FLAGS (Dashboard Truth System v2.0)
    # ========================================================================
    # All learning ledger analytics reads are gated behind this flag.
    # When False, analytics falls back to legacy logic for safe rollout.

    ENABLE_LEARNING_LEDGER: bool = Field(
        default=False,
        description="Enable Learning Ledger analytics (read from ActivityLog learning events)",
    )

    # Duration guardrail: cap per-review duration to prevent pollution
    # from idle tabs, backgrounding, or replay attacks
    MAX_REVIEW_DURATION_SECONDS: int = Field(
        default=600,  # 10 minutes max per single review
        description="Maximum duration (seconds) for a single review event (guardrail)",
    )

    # Streak calculation timezone policy
    # True = UTC (simpler, honest), False = user-local (better UX, more work)
    STREAK_USE_UTC: bool = Field(
        default=True,
        description="Calculate streaks in UTC (True) or user-local time (False)",
    )

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=True, extra="ignore"
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
