"""
Database session factory and connection management for SYNAPSE.

Uses asyncpg driver for async operations (FastAPI endpoints).
Uses psycopg2 driver for sync operations (Celery signals).
Sets search_path to developer_schema for all connections.
"""

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# ============================================================
# ASYNC ENGINE (for FastAPI endpoints)
# ============================================================
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.ENVIRONMENT == "development",
    future=True,
    pool_pre_ping=True,
    pool_recycle=300,
    # Set search_path at connection level
    connect_args={"server_settings": {"search_path": f"{settings.DATABASE_SCHEMA}, public"}},
)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


# ============================================================
# SYNC ENGINE (for Celery signal handlers)
# ============================================================
def _get_sync_database_url() -> str:
    """Convert async DATABASE_URL to sync (postgresql:// instead of postgresql+asyncpg://)."""
    url = settings.DATABASE_URL
    if "+asyncpg" in url:
        return url.replace("+asyncpg", "")
    if "postgresql+asyncpg://" in url:
        return url.replace("postgresql+asyncpg://", "postgresql://")
    return url


sync_engine = create_engine(
    _get_sync_database_url(),
    echo=False,  # Less verbose for background tasks
    pool_pre_ping=True,
    pool_recycle=300,
    # Set search_path at connection level
    connect_args={"options": f"-c search_path={settings.DATABASE_SCHEMA},public"},
)

# Sync session factory (for Celery signals)
SessionLocal = sessionmaker(
    bind=sync_engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides a database session.

    Usage:
        @app.post("/items")
        async def create_item(db: AsyncSession = Depends(get_db)):
            item = Item(...)
            db.add(item)
            await db.commit()
            return item
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    """
    Initialize database connections.
    Called during application startup.
    """
    from app.utils.logging import get_logger

    logger = get_logger(__name__)

    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))

            result = await conn.execute(text("SELECT current_schema()"))
            current_schema = result.scalar()

            logger.info(
                "database_initialized",
                current_schema=current_schema,
                expected_schema=settings.DATABASE_SCHEMA,
            )
    except Exception as e:
        logger.error(
            "database_initialization_failed",
            error=str(e),
            error_type=type(e).__name__,
        )
        raise


async def close_db() -> None:
    """
    Close database connections gracefully.
    Called during application shutdown.
    """
    from app.utils.logging import get_logger

    logger = get_logger(__name__)

    try:
        await engine.dispose()
        logger.info("database_connections_closed")
    except Exception as e:
        logger.error(
            "database_close_failed",
            error=str(e),
            error_type=type(e).__name__,
        )
        raise


async def test_db_connection() -> bool:
    """
    Test database connectivity.

    Returns:
        bool: True if connection successful, False otherwise
    """
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
