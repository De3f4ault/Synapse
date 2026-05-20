"""
Logical Replica session factory for the Synapse Admin Dashboard.

Mirrors session.py exactly but connects to ANALYTICS_DATABASE_URL (the Logical Replica)
instead of the Primary. All heavy analytical queries from the admin dashboard go here,
keeping them completely off the Primary's connection pool.

DEV FALLBACK:
    If ANALYTICS_DATABASE_URL is unset in development, reads fall back to the Primary
    with a warning log. Set ANALYTICS_DATABASE_URL=<replica_dsn> to use the real replica.

PRODUCTION:
    ANALYTICS_DATABASE_URL is required. App startup will fail with a clear RuntimeError
    if the variable is missing.

POOL SIZING:
    Smaller pool than the Primary (5 base vs 10). Analytics traffic is bursty (admin
    page loads) rather than sustained (student requests), so a small pool is correct.
"""

import logging
from typing import AsyncGenerator

from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

logger = logging.getLogger(__name__)

_SEARCH_PATH = f"{settings.DATABASE_SCHEMA}, public"


def _get_analytics_url() -> str:
    """
    Resolve the analytics database URL.

    Returns ANALYTICS_DATABASE_URL when set.
    Falls back to DATABASE_URL in development with a warning.
    Raises RuntimeError in production if ANALYTICS_DATABASE_URL is unset.
    """
    if settings.ANALYTICS_DATABASE_URL:
        return settings.ANALYTICS_DATABASE_URL

    if settings.ENVIRONMENT == "production":
        raise RuntimeError(
            "ANALYTICS_DATABASE_URL is required in production.\n"
            "Set it to the Logical Replica connection string "
            "(e.g. postgresql+asyncpg://user:pass@localhost:5434/synapse).\n"
            "The Admin Dashboard cannot run analytical queries against the Primary in production."
        )

    # Development: transparent fallback to Primary with loud warning
    logger.warning(
        "ANALYTICS_DATABASE_URL is not set. Admin Dashboard analytics reads are "
        "falling back to the Primary database. This degrades OLTP performance for "
        "live users. Run the Docker replica (make replica-start) to fix this."
    )
    return settings.DATABASE_URL


# ---------------------------------------------------------------------------
# Async engine — for FastAPI admin endpoints
# ---------------------------------------------------------------------------
analytics_engine = create_async_engine(
    _get_analytics_url(),
    echo=False,  # Never echo analytics queries — too verbose
    future=True,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=5,       # Smaller than Primary — analytics is bursty, not sustained
    max_overflow=10,
    pool_timeout=30,
    # NOTE: No connect_args/server_settings — PgBouncer-compatible.
    # search_path is set via pool event listener below.
)


@event.listens_for(analytics_engine.sync_engine, "connect")
def _set_analytics_search_path(dbapi_connection, connection_record):
    """
    Set search_path on every new replica connection.

    Identical to the Primary pool event in session.py — ensures all queries
    find tables under developer_schema without schema-qualifying every identifier.
    """
    cursor = dbapi_connection.cursor()
    cursor.execute(f"SET search_path TO {_SEARCH_PATH}")
    cursor.close()


# Async session factory — used by get_analytics_db() and get_routed_analytics_db()
AnalyticsSessionLocal = async_sessionmaker(
    analytics_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_analytics_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency: provides an async session to the Logical Replica.

    Use for all read-only admin aggregation queries. Never use for writes.

    Usage:
        @router.get("/admin/costs")
        async def get_costs(db: AsyncSession = Depends(get_analytics_db)):
            ...
    """
    async with AnalyticsSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
