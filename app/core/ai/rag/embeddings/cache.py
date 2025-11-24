"""Redis-based embedding cache for performance optimization."""

import hashlib
import json
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class EmbeddingCache:
    """
    Redis-based cache for storing and retrieving embeddings.

    Features:
    - TTL: 24 hours (configurable)
    - Key hashing: MD5 hash of text for consistent keys
    - Batch operations: Check multiple embeddings efficiently
    - Statistics: Track hit/miss rates

    Embeddings are expensive to compute, so caching is critical:
    - Same text appears frequently (study materials, notes)
    - Embedding generation: ~50ms per 512 tokens
    - Cache lookup: <1ms
    - Improvement: 50x faster for cache hits
    """

    KEY_PREFIX = "embedding"
    DEFAULT_TTL = 86400  # 24 hours

    def __init__(self, redis_client=None, ttl_seconds: int = DEFAULT_TTL):
        """
        Initialize embedding cache.

        Args:
            redis_client: Redis async client (optional)
            ttl_seconds: Time to live for cached embeddings (seconds)
        """
        self.redis_client = redis_client
        self.ttl_seconds = ttl_seconds
        self.stats = {
            "hits": 0,
            "misses": 0,
            "sets": 0,
        }
        logger.debug(f"EmbeddingCache initialized (TTL: {ttl_seconds}s)")

    def _get_cache_key(self, text: str) -> str:
        """
        Generate consistent cache key from text.

        Uses MD5 hash for consistent key generation.

        Args:
            text: Text to hash

        Returns:
            str: Cache key (format: "embedding:{hash}")
        """
        text_hash = hashlib.md5(text.encode()).hexdigest()
        return f"{self.KEY_PREFIX}:{text_hash}"

    async def get(self, text: str) -> Optional[List[float]]:
        """
        Get embedding from cache.

        Args:
            text: Text to look up

        Returns:
            List[float]: Embedding vector, or None if not cached
        """
        if not self.redis_client:
            return None

        try:
            cache_key = self._get_cache_key(text)
            cached = await self.redis_client.get(cache_key)

            if cached:
                self.stats["hits"] += 1
                logger.debug(f"Cache hit: {cache_key[:30]}...")
                return json.loads(cached)
            else:
                self.stats["misses"] += 1
                logger.debug(f"Cache miss: {cache_key[:30]}...")
                return None

        except Exception as e:
            logger.warning(f"Cache get failed: {str(e)}")
            return None

    async def set(self, text: str, embedding: List[float]) -> bool:
        """
        Store embedding in cache.

        Args:
            text: Original text
            embedding: Embedding vector to cache

        Returns:
            bool: Whether set was successful
        """
        if not self.redis_client:
            return False

        try:
            cache_key = self._get_cache_key(text)
            await self.redis_client.setex(
                cache_key,
                self.ttl_seconds,
                json.dumps(embedding),
            )
            self.stats["sets"] += 1
            logger.debug(f"Cached embedding: {cache_key[:30]}...")
            return True

        except Exception as e:
            logger.warning(f"Cache set failed: {str(e)}")
            return False

    async def get_batch(self, texts: List[str]) -> Dict[str, Optional[List[float]]]:
        """
        Get multiple embeddings from cache.

        Args:
            texts: List of texts to look up

        Returns:
            Dict: {text: embedding or None}
        """
        if not self.redis_client:
            return {text: None for text in texts}

        results = {}

        for text in texts:
            embedding = await self.get(text)
            results[text] = embedding

        logger.debug(f"Batch lookup: {len(texts)} texts, {sum(1 for v in results.values() if v)} hits")
        return results

    async def set_batch(self, embeddings_dict: Dict[str, List[float]]) -> int:
        """
        Store multiple embeddings in cache.

        Args:
            embeddings_dict: {text: embedding}

        Returns:
            int: Number successfully cached
        """
        if not self.redis_client:
            return 0

        success_count = 0

        for text, embedding in embeddings_dict.items():
            if await self.set(text, embedding):
                success_count += 1

        logger.debug(f"Batch set: {success_count}/{len(embeddings_dict)} cached")
        return success_count

    async def clear(self, pattern: str = f"{KEY_PREFIX}:*") -> int:
        """
        Clear cache entries matching pattern.

        Args:
            pattern: Key pattern to clear (Redis glob pattern)

        Returns:
            int: Number of keys deleted
        """
        if not self.redis_client:
            return 0

        try:
            cursor = 0
            deleted = 0

            while True:
                cursor, keys = await self.redis_client.scan(cursor, match=pattern)
                if keys:
                    deleted += await self.redis_client.delete(*keys)
                if cursor == 0:
                    break

            logger.info(f"Cleared {deleted} cache entries")
            return deleted

        except Exception as e:
            logger.error(f"Cache clear failed: {str(e)}")
            return 0

    def get_stats(self) -> Dict[str, int]:
        """
        Get cache statistics.

        Returns:
            Dict: {"hits": int, "misses": int, "sets": int, "hit_rate": float}
        """
        total = self.stats["hits"] + self.stats["misses"]
        hit_rate = self.stats["hits"] / total if total > 0 else 0

        return {
            "hits": self.stats["hits"],
            "misses": self.stats["misses"],
            "sets": self.stats["sets"],
            "hit_rate": hit_rate,
            "total_requests": total,
        }

    def reset_stats(self) -> None:
        """Reset cache statistics."""
        self.stats = {"hits": 0, "misses": 0, "sets": 0}
        logger.debug("Cache stats reset")
