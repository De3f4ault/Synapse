"""
Database session factory and connection management for SYNAPSE.

Uses asyncpg driver for async operations.
Sets search_path to developer_schema for all connections.
"""

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import text
from app.core.config import settings

# Create async engine with search_path configured
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.ENVIRONMENT == "development",
    future=True,
    pool_pre_ping=True,
    pool_recycle=300,
    # Set search_path at connection level
    connect_args={
        "server_settings": {
            "search_path": f"{settings.DATABASE_SCHEMA}, public"
        }
    }
)

# Session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
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
