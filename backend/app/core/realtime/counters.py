"""
Atomic counter operations using PostgreSQL-backed cache.

Replaces Redis INCRBY/DECRBY/GET with PgCacheClient increment/get.
Uses the kv_store UNLOGGED table for fast counter operations.
"""

from typing import Dict, Optional

from app.utils.logging import get_logger

logger = get_logger(__name__)


async def increment_counter(
    key: str,
    amount: int = 1,
    ttl: Optional[int] = None,
) -> int:
    """
    Atomically increment a counter.

    Creates the counter with value=amount if it doesn't exist.

    Args:
        key: Counter key
        amount: Amount to increment
        ttl: Optional TTL in seconds

    Returns:
        int: New counter value
    """
    from app.services.cache.client import get_cache

    cache = get_cache()
    new_value = await cache.increment(key, amount)

    if ttl and new_value == amount:
        # First increment (counter just created) — set TTL
        await cache.expire(key, ttl)

    return new_value


async def decrement_counter(
    key: str,
    amount: int = 1,
) -> int:
    """
    Atomically decrement a counter.

    Args:
        key: Counter key
        amount: Amount to decrement

    Returns:
        int: New counter value
    """
    from app.services.cache.client import get_cache

    cache = get_cache()
    return await cache.decrement(key, amount)


async def get_counter(key: str) -> int:
    """
    Get current counter value.

    Args:
        key: Counter key

    Returns:
        int: Counter value (0 if doesn't exist)
    """
    from app.services.cache.client import get_cache

    cache = get_cache()
    value = await cache.get(key, default=0)
    return int(value) if value else 0


async def set_counter(
    key: str,
    value: int,
    ttl: Optional[int] = None,
) -> None:
    """
    Set a counter to a specific value.

    Args:
        key: Counter key
        value: Value to set
        ttl: Optional TTL in seconds
    """
    from app.services.cache.client import get_cache

    cache = get_cache()
    await cache.set(key, value, ex=ttl)


async def delete_counter(key: str) -> None:
    """
    Delete a counter.

    Args:
        key: Counter key
    """
    from app.services.cache.client import get_cache

    cache = get_cache()
    await cache.delete(key)


async def get_multiple_counters(pattern: str) -> Dict[str, int]:
    """
    Get multiple counters matching a pattern.

    Args:
        pattern: Key pattern (e.g., "agent:*:requests")

    Returns:
        Dict mapping key to counter value
    """
    from app.services.cache.client import get_cache

    cache = get_cache()
    keys = await cache.keys(pattern)

    if not keys:
        return {}

    values = await cache.mget(*keys)

    result = {}
    for key, value in zip(keys, values):
        result[key] = int(value) if value else 0

    return result
