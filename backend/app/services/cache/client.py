"""
Cache client — PostgreSQL-backed singleton.

Provides the global cache instance used by middleware, services,
and background tasks. This replaces the previous Redis-backed
CacheClient with PgCacheClient (same API, backed by kv_store table).

Usage:
    from app.services.cache.client import get_cache, init_cache, close_cache

    # At startup (main.py lifespan):
    await init_cache()

    # In any service/middleware:
    cache = get_cache()
    await cache.set("key", "value", ex=300)
    value = await cache.get("key")
"""

import logging
from typing import Optional

from app.services.cache.pg_cache import PgCacheClient

logger = logging.getLogger(__name__)


# ============================================================================
# Global Cache Singleton
# ============================================================================

_cache_client: Optional[PgCacheClient] = None


def get_cache() -> PgCacheClient:
    """
    Get the global cache client instance.

    Returns:
        PgCacheClient: The PostgreSQL-backed cache client

    Raises:
        RuntimeError: If cache has not been initialized
    """
    if _cache_client is None:
        raise RuntimeError("Cache not initialized. Call init_cache() during startup.")
    return _cache_client


async def init_cache() -> None:
    """
    Initialize the cache client at application startup.

    Creates a PgCacheClient backed by the kv_store UNLOGGED table,
    using the existing SQLAlchemy async session factory.
    """
    global _cache_client

    if _cache_client is not None:
        logger.debug("cache_already_initialized")
        return

    from app.db.session import AsyncSessionLocal

    _cache_client = PgCacheClient(session_factory=AsyncSessionLocal)

    # Verify connectivity
    if await _cache_client.ping():
        logger.info("pg_cache_initialized")
    else:
        raise ConnectionError("Failed to verify PostgreSQL cache connectivity")


async def close_cache() -> None:
    """Close the global cache client (cleanup at shutdown)."""
    global _cache_client

    if _cache_client is not None:
        _cache_client = None
        logger.info("pg_cache_closed")


# ============================================================================
# Backward Compatibility Aliases
# ============================================================================
# Some modules import these names. Keep them working during migration.

# get_redis -> get_cache (same return type interface)
get_redis = get_cache
init_redis = init_cache
close_redis = close_cache

# Re-export CacheClient as an alias for PgCacheClient
CacheClient = PgCacheClient
