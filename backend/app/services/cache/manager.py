"""
High-level cache management operations.

Provides common caching patterns including cache-aside,
write-through, and specialized operations for the application.

All methods are async to match the PgCacheClient interface.
"""

import logging
import hashlib
from typing import Any, Callable, Optional
from functools import wraps

from .pg_cache import PgCacheClient

logger = logging.getLogger(__name__)


class CacheManager:
    """
    High-level cache operations and patterns.

    Implements common caching patterns with automatic
    key generation, TTL management, and fallback handling.

    All methods are async — call with `await`.
    """

    def __init__(self, client: PgCacheClient, default_ttl: int = 3600, key_prefix: str = "app"):
        """
        Initialize cache manager.

        Args:
            client: PgCacheClient instance
            default_ttl: Default TTL in seconds
            key_prefix: Prefix for all cache keys
        """
        self.client = client
        self.default_ttl = default_ttl
        self.key_prefix = key_prefix
        logger.debug(f"Initialized CacheManager (prefix={key_prefix}, ttl={default_ttl})")

    def make_key(self, *parts: str) -> str:
        """
        Generate cache key from parts.

        Args:
            *parts: Key components

        Returns:
            str: Formatted cache key
        """
        return f"{self.key_prefix}:{':'.join(str(p) for p in parts)}"

    async def cache_aside(
        self, key: str, fetch_func: Callable[[], Any], ttl: Optional[int] = None
    ) -> Any:
        """
        Cache-aside pattern (lazy loading).

        Checks cache first, fetches and caches on miss.

        Args:
            key: Cache key
            fetch_func: Function to fetch data on miss (can be sync or async)
            ttl: TTL in seconds (uses default if None)

        Returns:
            Any: Cached or fetched data
        """
        # Try to get from cache
        cached = await self.client.get(key)
        if cached is not None:
            logger.debug(f"Cache hit: {key}")
            return cached

        # Cache miss - fetch data
        logger.debug(f"Cache miss: {key}")
        try:
            import asyncio

            if asyncio.iscoroutinefunction(fetch_func):
                data = await fetch_func()
            else:
                data = fetch_func()

            # Store in cache
            if data is not None:
                await self.client.set(key, data, ex=ttl or self.default_ttl)

            return data

        except Exception as e:
            logger.error(f"Error fetching data for cache key '{key}': {e}")
            raise

    async def write_through(
        self, key: str, value: Any, persist_func: Callable[[Any], None], ttl: Optional[int] = None
    ) -> bool:
        """
        Write-through pattern.

        Writes to cache and persistent storage simultaneously.

        Args:
            key: Cache key
            value: Data to write
            persist_func: Function to persist data (can be sync or async)
            ttl: TTL in seconds

        Returns:
            bool: True if both operations succeeded
        """
        try:
            import asyncio

            # Write to persistent storage first
            if asyncio.iscoroutinefunction(persist_func):
                await persist_func(value)
            else:
                persist_func(value)

            # Then update cache
            return await self.client.set(key, value, ex=ttl or self.default_ttl)

        except Exception as e:
            logger.error(f"Write-through failed for key '{key}': {e}")
            return False

    async def get_or_compute(
        self,
        key: str,
        compute_func: Callable[[], Any],
        ttl: Optional[int] = None,
        force_refresh: bool = False,
    ) -> Any:
        """
        Get from cache or compute if missing.

        Args:
            key: Cache key
            compute_func: Function to compute value (can be sync or async)
            ttl: TTL in seconds
            force_refresh: Force recomputation

        Returns:
            Any: Cached or computed value
        """
        if not force_refresh:
            cached = await self.client.get(key)
            if cached is not None:
                return cached

        # Compute value
        import asyncio

        if asyncio.iscoroutinefunction(compute_func):
            value = await compute_func()
        else:
            value = compute_func()

        # Cache result
        if value is not None:
            await self.client.set(key, value, ex=ttl or self.default_ttl)

        return value

    async def cache_user_data(
        self, user_id: str, data_type: str, data: Any, ttl: Optional[int] = None
    ) -> bool:
        """
        Cache user-specific data.

        Args:
            user_id: User ID
            data_type: Type of data (e.g., 'profile', 'preferences')
            data: Data to cache
            ttl: TTL in seconds

        Returns:
            bool: True if cached successfully
        """
        key = self.make_key("user", user_id, data_type)
        return await self.client.set(key, data, ex=ttl or self.default_ttl)

    async def get_user_data(self, user_id: str, data_type: str, default: Any = None) -> Any:
        """
        Get cached user data.

        Args:
            user_id: User ID
            data_type: Type of data
            default: Default value if not found

        Returns:
            Any: Cached data or default
        """
        key = self.make_key("user", user_id, data_type)
        return await self.client.get(key, default=default)

    async def cache_query_results(self, query_hash: str, results: Any, ttl: int = 300) -> bool:
        """
        Cache search query results.

        Args:
            query_hash: Hash of query parameters
            results: Query results
            ttl: TTL in seconds (default: 5 minutes)

        Returns:
            bool: True if cached successfully
        """
        key = self.make_key("query", query_hash)
        return await self.client.set(key, results, ex=ttl)

    async def get_cached_query(self, query_hash: str) -> Optional[Any]:
        """
        Get cached query results.

        Args:
            query_hash: Hash of query parameters

        Returns:
            Any: Cached results or None
        """
        key = self.make_key("query", query_hash)
        return await self.client.get(key)

    def hash_query(self, **params) -> str:
        """
        Generate hash for query parameters.

        Args:
            **params: Query parameters

        Returns:
            str: Query hash
        """
        # Sort params for consistent hashing
        sorted_params = sorted(params.items())
        param_str = str(sorted_params)
        return hashlib.md5(param_str.encode()).hexdigest()

    async def increment_counter(
        self, counter_name: str, amount: int = 1, ttl: Optional[int] = None
    ) -> Optional[int]:
        """
        Increment a counter with optional TTL.

        Args:
            counter_name: Counter identifier
            amount: Amount to increment
            ttl: TTL for counter (if new)

        Returns:
            int: New counter value
        """
        key = self.make_key("counter", counter_name)
        new_value = await self.client.increment(key, amount)

        # Set TTL if counter is new
        if new_value == amount and ttl:
            await self.client.expire(key, ttl)

        return new_value

    async def get_counter(self, counter_name: str) -> int:
        """
        Get current counter value.

        Args:
            counter_name: Counter identifier

        Returns:
            int: Counter value (0 if doesn't exist)
        """
        key = self.make_key("counter", counter_name)
        value = await self.client.get(key, default=0)
        return int(value) if value else 0

    def cache_decorator(self, ttl: Optional[int] = None, key_func: Optional[Callable] = None):
        """
        Decorator for caching async function results.

        Args:
            ttl: TTL in seconds
            key_func: Custom function to generate cache key

        Returns:
            Decorator function
        """

        def decorator(func: Callable) -> Callable:
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Generate cache key
                if key_func:
                    cache_key = key_func(*args, **kwargs)
                else:
                    # Default: use function name and args
                    key_parts = [func.__name__]
                    key_parts.extend(str(a) for a in args)
                    key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
                    cache_key = self.make_key(*key_parts)

                # Try cache
                cached = await self.client.get(cache_key)
                if cached is not None:
                    logger.debug(f"Cache hit for {func.__name__}")
                    return cached

                # Execute function
                import asyncio

                if asyncio.iscoroutinefunction(func):
                    result = await func(*args, **kwargs)
                else:
                    result = func(*args, **kwargs)

                # Cache result
                if result is not None:
                    await self.client.set(cache_key, result, ex=ttl or self.default_ttl)

                return result

            return wrapper

        return decorator

    async def invalidate_pattern(self, pattern: str) -> int:
        """
        Invalidate all keys matching pattern.

        Args:
            pattern: Key pattern with wildcards

        Returns:
            int: Number of keys deleted

        Warning:
            Can be slow on large datasets
        """
        full_pattern = self.make_key(pattern)
        keys = await self.client.keys(full_pattern)

        if keys:
            return await self.client.delete(*keys)

        return 0
