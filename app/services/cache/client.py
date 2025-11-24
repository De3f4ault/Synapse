"""
Redis client for caching operations.

Manages Redis connections with connection pooling
and provides base caching operations.
"""

import logging
from typing import Any, Optional, Union
import json

import redis
from redis.connection import ConnectionPool

logger = logging.getLogger(__name__)


class CacheClient:
    """
    Redis client for distributed caching.

    Provides connection pooling, automatic serialization,
    and common caching patterns for high-performance operations.
    """

    def __init__(
        self,
        host: str = "localhost",
        port: int = 6379,
        db: int = 0,
        password: Optional[str] = None,
        socket_timeout: Optional[float] = None,
        socket_connect_timeout: Optional[float] = None,
        max_connections: int = 50,
        decode_responses: bool = True,
    ):
        """
        Initialize Redis client with connection pooling.

        Args:
            host: Redis server host
            port: Redis server port
            db: Database number
            password: Authentication password (optional)
            socket_timeout: Socket timeout in seconds
            socket_connect_timeout: Socket connect timeout
            max_connections: Max connections in pool
            decode_responses: Decode responses to strings
        """
        self.host = host
        self.port = port
        self.db = db

        # Create connection pool for better performance
        self.pool = ConnectionPool(
            host=host,
            port=port,
            db=db,
            password=password,
            socket_timeout=socket_timeout,
            socket_connect_timeout=socket_connect_timeout,
            max_connections=max_connections,
            decode_responses=decode_responses,
        )

        self._client: Optional[redis.Redis] = None
        logger.info(f"Initialized CacheClient (host={host}, port={port}, db={db})")

    def get_client(self) -> redis.Redis:
        """
        Get Redis client from connection pool.

        Returns:
            redis.Redis: Redis client instance
        """
        if self._client is None:
            self._client = redis.Redis(connection_pool=self.pool)
            logger.debug("Created Redis client from pool")

        return self._client

    def ping(self) -> bool:
        """
        Test Redis connection.

        Returns:
            bool: True if connection successful
        """
        try:
            client = self.get_client()
            return client.ping()
        except redis.ConnectionError as e:
            logger.error(f"Redis connection failed: {e}")
            return False

    def set(
        self,
        key: str,
        value: Any,
        ex: Optional[int] = None,
        px: Optional[int] = None,
        nx: bool = False,
        xx: bool = False,
    ) -> bool:
        """
        Set key-value pair in cache.

        Args:
            key: Cache key
            value: Value (auto-serialized if dict/list)
            ex: Expiration in seconds
            px: Expiration in milliseconds
            nx: Only set if key doesn't exist
            xx: Only set if key exists

        Returns:
            bool: True if set successfully
        """
        try:
            client = self.get_client()

            # Auto-serialize complex types
            if isinstance(value, (dict, list)):
                value = json.dumps(value)

            result = client.set(key, value, ex=ex, px=px, nx=nx, xx=xx)

            if result:
                logger.debug(f"Set cache key: {key} (ex={ex})")

            return bool(result)

        except Exception as e:
            logger.error(f"Failed to set cache key '{key}': {e}")
            return False

    def get(
        self,
        key: str,
        default: Any = None,
        deserialize: bool = True
    ) -> Any:
        """
        Get value from cache.

        Args:
            key: Cache key
            default: Default value if key not found
            deserialize: Auto-deserialize JSON

        Returns:
            Any: Cached value or default
        """
        try:
            client = self.get_client()
            value = client.get(key)

            if value is None:
                return default

            # Auto-deserialize JSON
            if deserialize and isinstance(value, (str, bytes)):
                try:
                    return json.loads(value)
                except (json.JSONDecodeError, TypeError):
                    pass

            return value

        except Exception as e:
            logger.error(f"Failed to get cache key '{key}': {e}")
            return default

    def delete(self, *keys: str) -> int:
        """
        Delete keys from cache.

        Args:
            *keys: Keys to delete

        Returns:
            int: Number of keys deleted
        """
        try:
            client = self.get_client()
            count = client.delete(*keys)
            logger.debug(f"Deleted {count} cache keys")
            return count

        except Exception as e:
            logger.error(f"Failed to delete cache keys: {e}")
            return 0

    def exists(self, *keys: str) -> int:
        """
        Check if keys exist.

        Args:
            *keys: Keys to check

        Returns:
            int: Number of existing keys
        """
        try:
            client = self.get_client()
            return client.exists(*keys)
        except Exception as e:
            logger.error(f"Failed to check key existence: {e}")
            return 0

    def expire(self, key: str, seconds: int) -> bool:
        """
        Set expiration on key.

        Args:
            key: Cache key
            seconds: Expiration in seconds

        Returns:
            bool: True if expiration set
        """
        try:
            client = self.get_client()
            return bool(client.expire(key, seconds))
        except Exception as e:
            logger.error(f"Failed to set expiration on '{key}': {e}")
            return False

    def ttl(self, key: str) -> int:
        """
        Get remaining TTL for key.

        Args:
            key: Cache key

        Returns:
            int: TTL in seconds (-2 = doesn't exist, -1 = no expiration)
        """
        try:
            client = self.get_client()
            return client.ttl(key)
        except Exception as e:
            logger.error(f"Failed to get TTL for '{key}': {e}")
            return -2

    def increment(self, key: str, amount: int = 1) -> Optional[int]:
        """
        Increment integer value.

        Args:
            key: Cache key
            amount: Amount to increment

        Returns:
            int: New value, or None on error
        """
        try:
            client = self.get_client()
            return client.incrby(key, amount)
        except Exception as e:
            logger.error(f"Failed to increment '{key}': {e}")
            return None

    def decrement(self, key: str, amount: int = 1) -> Optional[int]:
        """
        Decrement integer value.

        Args:
            key: Cache key
            amount: Amount to decrement

        Returns:
            int: New value, or None on error
        """
        try:
            client = self.get_client()
            return client.decrby(key, amount)
        except Exception as e:
            logger.error(f"Failed to decrement '{key}': {e}")
            return None

    def keys(self, pattern: str = "*") -> list[str]:
        """
        Get keys matching pattern.

        Args:
            pattern: Key pattern (supports wildcards)

        Returns:
            list[str]: Matching keys

        Warning:
            Use with caution in production (can be slow on large datasets)
        """
        try:
            client = self.get_client()
            return [key.decode() if isinstance(key, bytes) else key
                    for key in client.keys(pattern)]
        except Exception as e:
            logger.error(f"Failed to get keys with pattern '{pattern}': {e}")
            return []

    def flushdb(self) -> bool:
        """
        Clear all keys in current database.

        Returns:
            bool: True if successful

        Warning:
            Destructive operation - use with caution
        """
        try:
            client = self.get_client()
            client.flushdb()
            logger.warning(f"Flushed database {self.db}")
            return True
        except Exception as e:
            logger.error(f"Failed to flush database: {e}")
            return False

    def close(self) -> None:
        """Close connection pool."""
        if self.pool:
            self.pool.disconnect()
            logger.info("Redis connection pool closed")

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()

# ============================================================================
# Global Redis Instance
# ============================================================================

_redis_client: Optional[CacheClient] = None


def get_redis() -> redis.Redis:
    """
    Get global Redis client instance.

    Creates singleton instance on first call.
    Used by middleware and services for caching.

    Returns:
        redis.Redis: Redis client

    Raises:
        ConnectionError: If Redis is not available
    """
    global _redis_client

    if _redis_client is None:
        from app.core.config import settings

        # Parse Redis URL to get host, port, db
        # Format: redis://localhost:6379/0
        redis_url = settings.REDIS_URL

        # Simple parsing (you can use urllib.parse for more robust parsing)
        if redis_url.startswith("redis://"):
            redis_url = redis_url.replace("redis://", "")

        parts = redis_url.split("/")
        host_port = parts[0]
        db = int(parts[1]) if len(parts) > 1 else 0

        host_port_split = host_port.split(":")
        host = host_port_split[0]
        port = int(host_port_split[1]) if len(host_port_split) > 1 else 6379

        _redis_client = CacheClient(
            host=host,
            port=port,
            db=db,
        )

        logger.info(f"Initialized global Redis client: {host}:{port}/{db}")

    return _redis_client.get_client()

async def init_redis() -> None:
    """
    Initialize Redis connection at application startup.

    Creates the global Redis client and tests the connection.

    Raises:
        ConnectionError: If Redis is not available
    """
    global _redis_client

    if _redis_client is not None:
        logger.debug("Redis client already initialized")
        return

    from app.core.config import settings

    # Parse Redis URL to get host, port, db
    # Format: redis://localhost:6379/0
    redis_url = settings.REDIS_URL

    # Simple parsing (you can use urllib.parse for more robust parsing)
    if redis_url.startswith("redis://"):
        redis_url = redis_url.replace("redis://", "")

    parts = redis_url.split("/")
    host_port = parts[0]
    db = int(parts[1]) if len(parts) > 1 else 0

    host_port_split = host_port.split(":")
    host = host_port_split[0]
    port = int(host_port_split[1]) if len(host_port_split) > 1 else 6379

    _redis_client = CacheClient(
        host=host,
        port=port,
        db=db,
    )

    # Test the connection
    if not _redis_client.ping():
        raise ConnectionError(f"Failed to connect to Redis at {host}:{port}")

    logger.info(f"Redis initialized successfully: {host}:{port}/{db}")


async def close_redis() -> None:
    """Close global Redis connection."""
    global _redis_client

    if _redis_client is not None:
        _redis_client.close()
        _redis_client = None
        logger.info("Closed global Redis client")
