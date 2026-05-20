"""
RAG cache manager using PostgreSQL-backed cache.

Replaces the Redis-backed RedisCacheManager with PgCacheClient
for caching embeddings, queries, and retrieval results.

Now includes semantic query caching: near-miss queries (cosine sim > 0.92)
reuse cached results, bypassing the full Qdrant + cross-encoder pipeline.
"""

import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from sqlalchemy import text

from app.utils.logging import get_logger

logger = get_logger(__name__)


class PgRagCacheManager:
    """
    PostgreSQL-backed RAG cache manager.

    Replaces RedisCacheManager. Uses PgCacheClient (kv_store table)
    for all caching operations. Provides the same interface for
    embedding, query, and retrieval result caching.
    """

    # Default TTLs (in seconds)
    EMBEDDING_TTL = 86400  # 24 hours
    QUERY_TTL = 3600  # 1 hour
    RETRIEVAL_TTL = 1800  # 30 minutes
    SEMANTIC_TTL = 1800   # 30 minutes (matches exact-match cache)

    # Cosine similarity threshold for semantic cache hits.
    # 0.92 means queries must share ~92% of their semantic meaning.
    # Lower = more aggressive (more hits, risk of stale data).
    # Higher = more conservative (fewer hits, more precise).
    SEMANTIC_SIMILARITY_THRESHOLD = 0.92

    # Key prefixes
    PREFIX_EMBEDDING = "rag:embedding"
    PREFIX_QUERY = "rag:query"
    PREFIX_RETRIEVAL = "rag:retrieval"

    def __init__(self):
        """Initialize the RAG cache manager."""
        pass

    def _get_cache(self):
        """Get the PgCacheClient singleton."""
        from app.services.cache.client import get_cache

        return get_cache()

    def _hash_key(self, text: str) -> str:
        """Generate a short hash key from text."""
        return hashlib.md5(text.encode()).hexdigest()

    # ── Embedding Cache ──────────────────────────────────────

    async def get_embedding(self, text: str) -> Optional[List[float]]:
        """
        Get cached embedding for text.

        Args:
            text: Input text

        Returns:
            List[float] or None if not cached
        """
        cache = self._get_cache()
        key = f"{self.PREFIX_EMBEDDING}:{self._hash_key(text)}"
        result = await cache.get(key)
        return result

    async def set_embedding(
        self,
        text: str,
        embedding: List[float],
        ttl: Optional[int] = None,
    ) -> None:
        """
        Cache an embedding.

        Args:
            text: Input text
            embedding: Embedding vector
            ttl: TTL in seconds (default: 24h)
        """
        cache = self._get_cache()
        key = f"{self.PREFIX_EMBEDDING}:{self._hash_key(text)}"
        await cache.set(key, embedding, ex=ttl or self.EMBEDDING_TTL)

    # ── Query Cache ──────────────────────────────────────────

    async def get_query_result(self, query: str) -> Optional[Dict]:
        """
        Get cached query result.

        Args:
            query: Search query

        Returns:
            Dict or None if not cached
        """
        cache = self._get_cache()
        key = f"{self.PREFIX_QUERY}:{self._hash_key(query)}"
        return await cache.get(key)

    async def set_query_result(
        self,
        query: str,
        result: Dict,
        ttl: Optional[int] = None,
    ) -> None:
        """
        Cache a query result.

        Args:
            query: Search query
            result: Query result data
            ttl: TTL in seconds (default: 1h)
        """
        cache = self._get_cache()
        key = f"{self.PREFIX_QUERY}:{self._hash_key(query)}"
        await cache.set(key, result, ex=ttl or self.QUERY_TTL)

    # ── Semantic Query Cache ─────────────────────────────────

    async def get_semantic_query_result(
        self,
        user_id: int,
        query: str,
        source_type: str = "documents",
    ) -> Optional[Dict]:
        """
        Semantic cache lookup: finds a previous result whose query embedding
        is within cosine distance of the current query.

        Returns the cached result dict, or None on a cache miss.
        Also bumps the hit_count on the matched row for analytics.
        """
        try:
            from app.core.ai.embeddings.boundary import get_embedder
            from app.db.session import AsyncSessionLocal

            embedder = get_embedder()
            embedding = embedder.encode_query(query).tolist()
            emb_str = "[" + ",".join(str(v) for v in embedding) + "]"

            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    text("""
                        SELECT id, cached_result
                        FROM developer_schema.rag_semantic_cache
                        WHERE user_id     = :user_id
                          AND source_type = :source_type
                          AND expires_at  > NOW()
                          AND 1 - (embedding <=> CAST(:emb AS vector)) >= :threshold
                        ORDER BY embedding <=> CAST(:emb AS vector)
                        LIMIT 1
                    """),
                    {
                        "user_id": user_id,
                        "source_type": source_type,
                        "emb": emb_str,
                        "threshold": self.SEMANTIC_SIMILARITY_THRESHOLD,
                    },
                )
                row = result.fetchone()

                if row is None:
                    return None

                row_id, cached = row[0], row[1]

                # Bump hit counter asynchronously (fire-and-forget pattern)
                await session.execute(
                    text("""
                        UPDATE developer_schema.rag_semantic_cache
                        SET hit_count = hit_count + 1
                        WHERE id = :id
                    """),
                    {"id": row_id},
                )
                await session.commit()

                # asyncpg returns JSONB as a Python dict already
                if isinstance(cached, str):
                    cached = json.loads(cached)
                return cached

        except Exception as e:
            logger.warning("semantic_cache_get_failed", error=str(e)[:200])
            return None

    async def set_semantic_query_result(
        self,
        user_id: int,
        query: str,
        result: Dict,
        source_type: str = "documents",
        ttl: Optional[int] = None,
    ) -> None:
        """
        Store a RAG pipeline result in the semantic cache alongside its
        query embedding so future near-miss queries can retrieve it.
        """
        try:
            from app.core.ai.embeddings.boundary import get_embedder
            from app.db.session import AsyncSessionLocal

            embedder = get_embedder()
            embedding = embedder.encode_query(query).tolist()
            emb_str = "[" + ",".join(str(v) for v in embedding) + "]"

            seconds = ttl or self.SEMANTIC_TTL
            expires_at = datetime.now(timezone.utc) + timedelta(seconds=seconds)

            async with AsyncSessionLocal() as session:
                await session.execute(
                    text("""
                        INSERT INTO developer_schema.rag_semantic_cache
                            (user_id, source_type, query_text, embedding, cached_result, expires_at)
                        VALUES
                            (:user_id, :source_type, :query_text,
                             CAST(:emb AS vector), CAST(:result AS jsonb), :expires_at)
                        ON CONFLICT DO NOTHING
                    """),
                    {
                        "user_id": user_id,
                        "source_type": source_type,
                        "query_text": query,
                        "emb": emb_str,
                        "result": json.dumps(result),
                        "expires_at": expires_at,
                    },
                )
                await session.commit()

        except Exception as e:
            logger.warning("semantic_cache_set_failed", error=str(e)[:200])

    # ── Retrieval Cache ───────────────────────────────────────

    async def get_retrieval_result(self, key: str) -> Optional[Dict]:
        """
        Get cached retrieval result.

        Args:
            key: Retrieval key

        Returns:
            Dict or None if not cached
        """
        cache = self._get_cache()
        cache_key = f"{self.PREFIX_RETRIEVAL}:{key}"
        return await cache.get(cache_key)

    async def set_retrieval_result(
        self,
        key: str,
        result: Dict,
        ttl: Optional[int] = None,
    ) -> None:
        """
        Cache a retrieval result.

        Args:
            key: Retrieval key
            result: Retrieval result data
            ttl: TTL in seconds (default: 30min)
        """
        cache = self._get_cache()
        cache_key = f"{self.PREFIX_RETRIEVAL}:{key}"
        await cache.set(cache_key, result, ex=ttl or self.RETRIEVAL_TTL)

    # ── Admin ────────────────────────────────────────────────

    async def clear_all(self) -> int:
        """
        Clear all RAG cache entries.

        Returns:
            int: Number of keys deleted
        """
        cache = self._get_cache()
        total = 0

        for prefix in [self.PREFIX_EMBEDDING, self.PREFIX_QUERY, self.PREFIX_RETRIEVAL]:
            keys = await cache.keys(f"{prefix}:*")
            if keys:
                total += await cache.delete(*keys)

        logger.info("rag_cache_cleared", keys_deleted=total)
        return total

    async def ping(self) -> bool:
        """Health check."""
        cache = self._get_cache()
        return await cache.ping()


# Module-level singleton
_rag_cache: Optional[PgRagCacheManager] = None


def get_rag_cache() -> PgRagCacheManager:
    """Get the global RAG cache manager."""
    global _rag_cache
    if _rag_cache is None:
        _rag_cache = PgRagCacheManager()
    return _rag_cache
