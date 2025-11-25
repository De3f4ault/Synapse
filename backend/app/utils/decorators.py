"""
Utility decorators for common patterns.

Provides decorators for:
- Caching with Redis
- Retry logic with exponential backoff
- Rate limiting
- Execution timing
"""

import asyncio
import functools
import hashlib
import time
from typing import Any, Callable, Optional

from app.utils.logging import get_logger

logger = get_logger(__name__)


def cache(ttl: int = 300):
    """
    Cache function result in Redis.

    Args:
        ttl: Time to live in seconds (default: 300 = 5 minutes)

    Usage:
        @cache(ttl=600)
        async def get_user_context(user_id: int):
            # Expensive operation
            return context
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            # Lazy import to avoid circular dependencies
            try:
                from app.services.cache.manager import get as cache_get
                from app.services.cache.manager import set as cache_set
            except ImportError:
                # If cache not available, just execute function
                return await func(*args, **kwargs)

            # Generate cache key from function name and arguments
            key_parts = [func.__module__, func.__name__]
            key_parts.extend(str(arg) for arg in args)
            key_parts.extend(f"{k}:{v}" for k, v in sorted(kwargs.items()))

            key_string = "|".join(key_parts)
            cache_key = f"cache:{hashlib.md5(key_string.encode()).hexdigest()}"

            # Try to get from cache
            cached = await cache_get(cache_key)
            if cached is not None:
                logger.debug(
                    "cache_hit",
                    function=func.__name__,
                    key=cache_key,
                )
                return cached

            # Execute function
            result = await func(*args, **kwargs)

            # Store in cache
            await cache_set(cache_key, result, ttl=ttl)

            logger.debug(
                "cache_miss",
                function=func.__name__,
                key=cache_key,
            )

            return result

        return wrapper
    return decorator


def retry(max_attempts: int = 3, backoff: float = 2.0, exceptions: tuple = (Exception,)):
    """
    Retry function on exception with exponential backoff.

    Args:
        max_attempts: Maximum number of retry attempts (default: 3)
        backoff: Backoff multiplier (default: 2.0)
        exceptions: Tuple of exceptions to catch (default: (Exception,))

    Usage:
        @retry(max_attempts=5, backoff=2.0)
        async def api_call():
            # Potentially failing operation
            return result
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            last_exception = None

            for attempt in range(max_attempts):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e

                    if attempt < max_attempts - 1:
                        wait_time = backoff ** attempt

                        logger.warning(
                            "retry_attempt",
                            function=func.__name__,
                            attempt=attempt + 1,
                            max_attempts=max_attempts,
                            wait_seconds=wait_time,
                            error=str(e),
                        )

                        await asyncio.sleep(wait_time)
                    else:
                        logger.error(
                            "retry_exhausted",
                            function=func.__name__,
                            attempts=max_attempts,
                            error=str(e),
                        )

            # If we get here, all retries failed
            raise last_exception

        return wrapper
    return decorator


def rate_limit(max_calls: int = 100, period: int = 60):
    """
    Rate limit function calls using Redis.

    Args:
        max_calls: Maximum number of calls allowed (default: 100)
        period: Time period in seconds (default: 60)

    Usage:
        @rate_limit(max_calls=10, period=60)
        async def expensive_operation(user_id: int):
            # Rate-limited operation
            return result

    Raises:
        Exception: If rate limit exceeded
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            # Lazy import to avoid circular dependencies
            try:
                from app.services.cache.manager import incr, expire, get
            except ImportError:
                # If cache not available, skip rate limiting
                return await func(*args, **kwargs)

            # Generate rate limit key
            # Extract user_id if available
            user_id = kwargs.get("user_id") or (args[0] if args else "global")
            key = f"rate_limit:{func.__name__}:{user_id}"

            # Get current count
            current = await get(key)
            current_int = int(current) if current else 0

            if current_int >= max_calls:
                logger.warning(
                    "rate_limit_exceeded",
                    function=func.__name__,
                    user_id=user_id,
                    limit=max_calls,
                    period=period,
                )
                raise Exception(f"Rate limit exceeded: {max_calls} calls per {period}s")

            # Increment counter
            new_count = await incr(key)

            # Set expiration on first call
            if new_count == 1:
                await expire(key, period)

            logger.debug(
                "rate_limit_check",
                function=func.__name__,
                user_id=user_id,
                count=new_count,
                limit=max_calls,
            )

            return await func(*args, **kwargs)

        return wrapper
    return decorator


def timing(threshold_ms: float = 1000.0):
    """
    Measure and log function execution time.

    Logs a warning if execution exceeds threshold.

    Args:
        threshold_ms: Threshold in milliseconds (default: 1000)

    Usage:
        @timing(threshold_ms=500)
        async def slow_operation():
            # Operation to measure
            return result
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            start_time = time.time()

            try:
                result = await func(*args, **kwargs)
                return result
            finally:
                duration_ms = (time.time() - start_time) * 1000

                if duration_ms > threshold_ms:
                    logger.warning(
                        "slow_operation",
                        function=func.__name__,
                        duration_ms=round(duration_ms, 2),
                        threshold_ms=threshold_ms,
                    )
                else:
                    logger.debug(
                        "operation_timed",
                        function=func.__name__,
                        duration_ms=round(duration_ms, 2),
                    )

        return wrapper
    return decorator
