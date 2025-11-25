"""
Redis counter operations for real-time metrics.
Provides atomic increment/decrement operations with sub-millisecond latency.
"""
from typing import Dict, Optional

from app.services.cache.client import get_redis
from app.utils.logging import get_logger

logger = get_logger(__name__)


async def increment(key: str, amount: int = 1) -> int:
    """
    Atomically increment a counter.

    Args:
        key: Redis key for the counter
        amount: Amount to increment (default: 1)

    Returns:
        int: New counter value
    """
    try:
        redis = await get_redis()
        new_value = await redis.incrby(key, amount)
        return new_value
    except Exception as e:
        logger.error(
            "counter_increment_failed",
            key=key,
            amount=amount,
            error=str(e),
        )
        raise


async def decrement(key: str, amount: int = 1) -> int:
    """
    Atomically decrement a counter.

    Args:
        key: Redis key for the counter
        amount: Amount to decrement (default: 1)

    Returns:
        int: New counter value
    """
    try:
        redis = await get_redis()
        new_value = await redis.decrby(key, amount)
        return new_value
    except Exception as e:
        logger.error(
            "counter_decrement_failed",
            key=key,
            amount=amount,
            error=str(e),
        )
        raise


async def get_counter(key: str) -> int:
    """
    Get the current value of a counter.

    Args:
        key: Redis key for the counter

    Returns:
        int: Counter value (0 if not exists)
    """
    try:
        redis = await get_redis()
        value = await redis.get(key)
        return int(value) if value else 0
    except Exception as e:
        logger.error(
            "counter_get_failed",
            key=key,
            error=str(e),
        )
        return 0


async def reset_counter(key: str) -> None:
    """
    Reset a counter to zero by deleting the key.

    Args:
        key: Redis key for the counter
    """
    try:
        redis = await get_redis()
        await redis.delete(key)
    except Exception as e:
        logger.error(
            "counter_reset_failed",
            key=key,
            error=str(e),
        )


async def get_multiple(pattern: str) -> Dict[str, int]:
    """
    Get multiple counters matching a pattern.

    Args:
        pattern: Redis key pattern (e.g., "agent:*:calls")

    Returns:
        Dict[str, int]: Dictionary of key -> value pairs
    """
    try:
        redis = await get_redis()

        # Scan for matching keys
        keys = []
        cursor = 0
        while True:
            cursor, partial_keys = await redis.scan(
                cursor=cursor,
                match=pattern,
                count=100
            )
            keys.extend(partial_keys)
            if cursor == 0:
                break

        # Get values for all keys
        result = {}
        if keys:
            values = await redis.mget(keys)
            for key, value in zip(keys, values):
                result[key] = int(value) if value else 0

        return result

    except Exception as e:
        logger.error(
            "counter_get_multiple_failed",
            pattern=pattern,
            error=str(e),
        )
        return {}


async def set_counter(key: str, value: int, ttl: Optional[int] = None) -> None:
    """
    Set a counter to a specific value.

    Args:
        key: Redis key for the counter
        value: Value to set
        ttl: Optional time-to-live in seconds
    """
    try:
        redis = await get_redis()
        await redis.set(key, value)

        if ttl:
            await redis.expire(key, ttl)

    except Exception as e:
        logger.error(
            "counter_set_failed",
            key=key,
            value=value,
            error=str(e),
        )


async def increment_with_ttl(
    key: str,
    amount: int = 1,
    ttl: int = 3600
) -> int:
    """
    Increment a counter and set TTL if it's the first increment.
    Useful for time-windowed counters (e.g., requests per hour).

    Args:
        key: Redis key for the counter
        amount: Amount to increment
        ttl: Time-to-live in seconds (default: 1 hour)

    Returns:
        int: New counter value
    """
    try:
        redis = await get_redis()

        # Increment counter
        new_value = await redis.incrby(key, amount)

        # Set TTL only on first increment
        if new_value == amount:
            await redis.expire(key, ttl)

        return new_value

    except Exception as e:
        logger.error(
            "counter_increment_ttl_failed",
            key=key,
            amount=amount,
            ttl=ttl,
            error=str(e),
        )
        raise
