"""
Caching service backed by PostgreSQL.

Provides distributed caching capabilities using the kv_store
UNLOGGED table, with automatic expiration via cleanup functions
and a durable event bus for real-time pub/sub.
"""

from .client import CacheClient, get_cache, init_cache, close_cache
from .pg_cache import PgCacheClient
from .manager import CacheManager
from .invalidation import CacheInvalidator
from .event_bus import PgEventBus, get_event_bus, init_event_bus, close_event_bus

__all__ = [
    # Core cache
    "CacheClient",
    "PgCacheClient",
    "get_cache",
    "init_cache",
    "close_cache",
    # Cache patterns
    "CacheManager",
    "CacheInvalidator",
    # Event bus (pub/sub)
    "PgEventBus",
    "get_event_bus",
    "init_event_bus",
    "close_event_bus",
]
