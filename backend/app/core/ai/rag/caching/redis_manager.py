"""Redis cache manager for SYNAPSE RAG."""

import redis
import pickle
import hashlib
import structlog
from typing import Any, Optional
from app.core.ai.rag.config.redis_config import RedisConfig

logger = structlog.get_logger(__name__)


class RedisCacheManager:
    """
    Centralized Redis cache manager for RAG system.
    
    Handles:
    - Embedding caching
    - Query result caching
    - Retrieval result caching
    """
    
    def __init__(self, config: RedisConfig):
        """Initialize Redis connection"""
        self.config = config
        
        # Create connection pool
        pool = redis.ConnectionPool(
            host=config.host,
            port=config.port,
            db=config.db,
            password=config.password,
            max_connections=config.max_connections,
            socket_timeout=config.socket_timeout,
            socket_connect_timeout=config.socket_connect_timeout,
            decode_responses=config.decode_responses
        )
        
        self.redis = redis.Redis(connection_pool=pool)
        
        # Test connection
        try:
            self.redis.ping()
            logger.info(
                "redis_connected",
                host=config.host,
                port=config.port,
                db=config.db
            )
        except redis.ConnectionError as e:
            logger.error("redis_connection_failed", error=str(e))
            raise
    
    def get_embedding(self, text: str) -> Optional[Any]:
        """Get cached embedding"""
        key = self._make_key(self.config.embedding_prefix, text)
        return self._get(key)
    
    def set_embedding(self, text: str, embedding: Any):
        """Cache embedding with TTL"""
        key = self._make_key(self.config.embedding_prefix, text)
        self._set(key, embedding, ttl=self.config.embedding_ttl)
    
    def get_query_result(self, query: str, user_id: int) -> Optional[Any]:
        """Get cached query result"""
        cache_key = f"{query}:{user_id}"
        key = self._make_key(self.config.query_prefix, cache_key)
        return self._get(key)
    
    def set_query_result(self, query: str, user_id: int, result: Any):
        """Cache query result with TTL"""
        cache_key = f"{query}:{user_id}"
        key = self._make_key(self.config.query_prefix, cache_key)
        self._set(key, result, ttl=self.config.query_cache_ttl)
    
    def get_retrieval_result(
        self,
        query: str,
        user_id: int,
        top_k: int
    ) -> Optional[Any]:
        """Get cached retrieval result"""
        cache_key = f"{query}:{user_id}:{top_k}"
        key = self._make_key(self.config.retrieval_prefix, cache_key)
        return self._get(key)
    
    def set_retrieval_result(
        self,
        query: str,
        user_id: int,
        top_k: int,
        result: Any
    ):
        """Cache retrieval result with TTL"""
        cache_key = f"{query}:{user_id}:{top_k}"
        key = self._make_key(self.config.retrieval_prefix, cache_key)
        self._set(key, result, ttl=self.config.retrieval_cache_ttl)
    
    def invalidate_user_cache(self, user_id: int):
        """Invalidate all cache entries for a user"""
        patterns = [
            f"{self.config.query_prefix}*:{user_id}",
            f"{self.config.retrieval_prefix}*:{user_id}"
        ]
        
        deleted = 0
        for pattern in patterns:
            keys = self.redis.keys(pattern)
            if keys:
                deleted += self.redis.delete(*keys)
        
        logger.info("user_cache_invalidated", user_id=user_id, deleted=deleted)
    
    def clear_all_caches(self):
        """Clear all RAG caches (use with caution!)"""
        patterns = [
            f"{self.config.embedding_prefix}*",
            f"{self.config.query_prefix}*",
            f"{self.config.retrieval_prefix}*"
        ]
        
        total_deleted = 0
        for pattern in patterns:
            keys = self.redis.keys(pattern)
            if keys:
                total_deleted += self.redis.delete(*keys)
        
        logger.info("all_caches_cleared", deleted=total_deleted)
    
    def get_stats(self) -> dict:
        """Get cache statistics"""
        info = self.redis.info("stats")
        
        # Count keys by prefix
        embedding_keys = len(self.redis.keys(f"{self.config.embedding_prefix}*"))
        query_keys = len(self.redis.keys(f"{self.config.query_prefix}*"))
        retrieval_keys = len(self.redis.keys(f"{self.config.retrieval_prefix}*"))
        
        return {
            "total_keys": info.get("db0", {}).get("keys", 0),
            "embedding_keys": embedding_keys,
            "query_keys": query_keys,
            "retrieval_keys": retrieval_keys,
            "total_commands_processed": info.get("total_commands_processed", 0),
            "keyspace_hits": info.get("keyspace_hits", 0),
            "keyspace_misses": info.get("keyspace_misses", 0),
            "hit_rate": self._calculate_hit_rate(info)
        }
    
    def _get(self, key: str) -> Optional[Any]:
        """Get value from Redis and deserialize"""
        try:
            cached = self.redis.get(key)
            if cached:
                return pickle.loads(cached)
        except Exception as e:
            logger.error("cache_get_failed", key=key, error=str(e))
        return None
    
    def _set(self, key: str, value: Any, ttl: int):
        """Serialize and set value in Redis with TTL"""
        try:
            serialized = pickle.dumps(value)
            self.redis.setex(key, ttl, serialized)
        except Exception as e:
            logger.error("cache_set_failed", key=key, error=str(e))
    
    def _make_key(self, prefix: str, text: str) -> str:
        """Generate cache key from prefix and text hash"""
        text_hash = hashlib.md5(text.encode()).hexdigest()
        return f"{prefix}{text_hash}"
    
    def _calculate_hit_rate(self, info: dict) -> float:
        """Calculate cache hit rate"""
        hits = info.get("keyspace_hits", 0)
        misses = info.get("keyspace_misses", 0)
        total = hits + misses
        return hits / total if total > 0 else 0.0
    
    def health_check(self) -> bool:
        """Check if Redis is healthy"""
        try:
            return self.redis.ping()
        except Exception as e:
            logger.error("redis_health_check_failed", error=str(e))
            return False


# Global cache manager instance
_cache_manager: Optional[RedisCacheManager] = None


def get_cache_manager(config: Optional[RedisConfig] = None) -> RedisCacheManager:
    """Get global cache manager instance"""
    global _cache_manager
    
    if _cache_manager is None:
        if config is None:
            config = RedisConfig()
        _cache_manager = RedisCacheManager(config)
    
    return _cache_manager
