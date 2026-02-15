"""Caching package initialization."""

from app.core.ai.rag.caching.cache_manager import PgRagCacheManager, get_rag_cache

# Backward compatibility aliases
RedisCacheManager = PgRagCacheManager
get_cache_manager = get_rag_cache

__all__ = [
    "PgRagCacheManager",
    "get_rag_cache",
    # Backward compat
    "RedisCacheManager",
    "get_cache_manager",
]
