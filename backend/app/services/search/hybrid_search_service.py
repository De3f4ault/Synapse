"""PostgreSQL Hybrid Search Service.

Python-side implementation of hybrid search combining:
- BM25 (keyword) search via ParadeDB @@@ operator
- Vector (semantic) search via pgvector <=> operator
- RRF (Reciprocal Rank Fusion) for score combination

This approach executes queries in parallel and fuses results in Python,
avoiding plpgsql operator tokenization issues.
"""

import asyncio
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.ai.rag.embeddings.models.all_minilm import AllMiniLMEmbedder

logger = structlog.get_logger(__name__)


@dataclass
class HybridSearchResult:
    """Result from hybrid search."""

    id: int
    title: Optional[str]
    content: str
    bm25_rank: int
    bm25_score: float
    vector_rank: int
    vector_score: float
    hybrid_score: float


@dataclass
class FlashcardSearchResult:
    """Result from flashcard hybrid search."""

    id: int
    front_text: str
    back_text: str
    deck_id: int
    bm25_rank: int
    bm25_score: float
    vector_rank: int
    vector_score: float
    hybrid_score: float


@dataclass
class ChatMessageSearchResult:
    """Result from chat message hybrid search."""

    id: int
    session_id: int
    content: str
    role: str
    session_title: Optional[str]
    bm25_rank: int
    bm25_score: float
    vector_rank: int
    vector_score: float
    hybrid_score: float


def rrf_score(rank: int, k: int = 60) -> float:
    """Calculate Reciprocal Rank Fusion score."""
    return 1.0 / (k + rank)


def fuse_results(
    bm25_results: List[Dict[str, Any]],
    vector_results: List[Dict[str, Any]],
    bm25_weight: float = 0.5,
    vector_weight: float = 0.5,
    rrf_k: int = 60,
    limit: int = 10,
) -> List[Dict[str, Any]]:
    """
    Fuse BM25 and vector results using Reciprocal Rank Fusion.

    Args:
        bm25_results: Results from BM25 search with 'id' and 'score'
        vector_results: Results from vector search with 'id' and 'score'
        bm25_weight: Weight for BM25 component (0-1)
        vector_weight: Weight for vector component (0-1)
        rrf_k: RRF constant (higher = more uniform ranking)
        limit: Maximum results to return

    Returns:
        Fused results sorted by hybrid score
    """
    # Build rank maps
    bm25_ranks = {r["id"]: (i + 1, r) for i, r in enumerate(bm25_results)}
    vector_ranks = {r["id"]: (i + 1, r) for i, r in enumerate(vector_results)}

    # Get all unique IDs
    all_ids = set(bm25_ranks.keys()) | set(vector_ranks.keys())

    # Calculate hybrid scores
    fused = []
    default_rank = len(all_ids) + 10  # Penalty rank for missing results

    for item_id in all_ids:
        bm25_rank, bm25_data = bm25_ranks.get(item_id, (default_rank, {}))
        vector_rank, vector_data = vector_ranks.get(item_id, (default_rank, {}))

        # Get the actual data from whichever source has it
        data = bm25_data if bm25_data else vector_data

        # Calculate RRF hybrid score
        hybrid_score = bm25_weight * rrf_score(bm25_rank, rrf_k) + vector_weight * rrf_score(
            vector_rank, rrf_k
        )

        fused.append(
            {
                **data,
                "bm25_rank": bm25_rank if bm25_rank != default_rank else 0,
                "bm25_score": bm25_data.get("score", 0.0) if bm25_data else 0.0,
                "vector_rank": vector_rank if vector_rank != default_rank else 0,
                "vector_score": vector_data.get("score", 0.0) if vector_data else 0.0,
                "hybrid_score": hybrid_score,
            }
        )

    # Sort by hybrid score descending
    fused.sort(key=lambda x: x["hybrid_score"], reverse=True)

    return fused[:limit]


class HybridSearchService:
    """
    Python-native hybrid search using parallel BM25 + vector queries.

    Uses:
    - ParadeDB @@@ operator for BM25 keyword search
    - pgvector <=> operator for semantic vector search
    - RRF (Reciprocal Rank Fusion) for score combination

    Example:
        service = HybridSearchService()
        results = await service.search_notes(
            db=session,
            query="PostgreSQL transactions",
            user_id=1,
            limit=10
        )
    """

    def __init__(self):
        """Initialize hybrid search service with embedder."""
        self._embedder: Optional[AllMiniLMEmbedder] = None
        logger.info("hybrid_search_service_initialized")

    @property
    def embedder(self) -> AllMiniLMEmbedder:
        """Lazy-load embedder on first use."""
        if self._embedder is None:
            self._embedder = AllMiniLMEmbedder()
        return self._embedder

    def _get_query_embedding(self, query: str) -> str:
        """Generate embedding and format for PostgreSQL vector type."""
        embedding = self.embedder.encode(query)
        embedding_list = embedding[0].tolist() if embedding.ndim > 1 else embedding.tolist()
        return "[" + ",".join(map(str, embedding_list)) + "]"

    async def _bm25_search_notes(
        self, db: AsyncSession, query: str, user_id: int, limit: int
    ) -> List[Dict[str, Any]]:
        """Execute BM25 keyword search on notes."""
        try:
            result = await db.execute(
                text("""
                    SELECT 
                        n.id,
                        n.title,
                        n.content,
                        pdb.score(n.id) AS score
                    FROM developer_schema.notes n
                    WHERE 
                        n.user_id = :user_id
                        AND n.deleted_at IS NULL
                        AND n.content @@@ :query
                    ORDER BY pdb.score(n.id) DESC
                    LIMIT :limit
                """),
                {"query": query, "user_id": user_id, "limit": limit},
            )
            rows = result.fetchall()
            return [
                {"id": r.id, "title": r.title, "content": r.content, "score": r.score} for r in rows
            ]
        except Exception as e:
            logger.warning("bm25_search_notes_failed", error=str(e)[:100])
            return []

    async def _vector_search_notes(
        self, db: AsyncSession, embedding_str: str, user_id: int, limit: int
    ) -> List[Dict[str, Any]]:
        """Execute vector semantic search on notes."""
        try:
            result = await db.execute(
                text("""
                    SELECT 
                        n.id,
                        n.title,
                        n.content,
                        (1 - (n.embedding <=> CAST(:embedding AS vector(384))))::FLOAT AS score
                    FROM developer_schema.notes n
                    WHERE 
                        n.user_id = :user_id
                        AND n.deleted_at IS NULL
                        AND n.embedding IS NOT NULL
                    ORDER BY n.embedding <=> CAST(:embedding AS vector(384))
                    LIMIT :limit
                """),
                {"embedding": embedding_str, "user_id": user_id, "limit": limit},
            )
            rows = result.fetchall()
            return [
                {"id": r.id, "title": r.title, "content": r.content, "score": r.score} for r in rows
            ]
        except Exception as e:
            logger.warning("vector_search_notes_failed", error=str(e)[:100])
            return []

    async def _bm25_search_flashcards(
        self, db: AsyncSession, query: str, user_id: int, limit: int
    ) -> List[Dict[str, Any]]:
        """Execute BM25 keyword search on flashcards."""
        try:
            result = await db.execute(
                text("""
                    SELECT 
                        f.id,
                        f.front_text,
                        f.back_text,
                        f.deck_id,
                        pdb.score(f.id) AS score
                    FROM developer_schema.flashcards f
                    INNER JOIN developer_schema.decks d ON f.deck_id = d.id
                    WHERE 
                        d.user_id = :user_id
                        AND f.deleted_at IS NULL
                        AND d.deleted_at IS NULL
                        AND f.front_text @@@ :query
                    ORDER BY pdb.score(f.id) DESC
                    LIMIT :limit
                """),
                {"query": query, "user_id": user_id, "limit": limit},
            )
            rows = result.fetchall()
            return [
                {
                    "id": r.id,
                    "front_text": r.front_text,
                    "back_text": r.back_text,
                    "deck_id": r.deck_id,
                    "score": r.score,
                }
                for r in rows
            ]
        except Exception as e:
            logger.warning("bm25_search_flashcards_failed", error=str(e)[:100])
            return []

    async def _vector_search_flashcards(
        self, db: AsyncSession, embedding_str: str, user_id: int, limit: int
    ) -> List[Dict[str, Any]]:
        """Execute vector semantic search on flashcards."""
        try:
            result = await db.execute(
                text("""
                    SELECT 
                        f.id,
                        f.front_text,
                        f.back_text,
                        f.deck_id,
                        (1 - (f.content_embedding <=> CAST(:embedding AS vector(384))))::FLOAT AS score
                    FROM developer_schema.flashcards f
                    INNER JOIN developer_schema.decks d ON f.deck_id = d.id
                    WHERE 
                        d.user_id = :user_id
                        AND f.deleted_at IS NULL
                        AND d.deleted_at IS NULL
                        AND f.content_embedding IS NOT NULL
                    ORDER BY f.content_embedding <=> CAST(:embedding AS vector(384))
                    LIMIT :limit
                """),
                {"embedding": embedding_str, "user_id": user_id, "limit": limit},
            )
            rows = result.fetchall()
            return [
                {
                    "id": r.id,
                    "front_text": r.front_text,
                    "back_text": r.back_text,
                    "deck_id": r.deck_id,
                    "score": r.score,
                }
                for r in rows
            ]
        except Exception as e:
            logger.warning("vector_search_flashcards_failed", error=str(e)[:100])
            return []

    async def search_notes(
        self,
        db: AsyncSession,
        query: str,
        user_id: int,
        limit: int = 10,
        bm25_weight: float = 0.5,
        vector_weight: float = 0.5,
    ) -> List[HybridSearchResult]:
        """
        Hybrid search notes using parallel BM25 + vector with RRF fusion.

        Args:
            db: Database session
            query: Search query text
            user_id: User ID to filter notes
            limit: Maximum results to return
            bm25_weight: Weight for BM25 scores (0-1)
            vector_weight: Weight for vector scores (0-1)

        Returns:
            List of HybridSearchResult ordered by hybrid score
        """
        logger.info("hybrid_search_notes_start", query=query[:50], user_id=user_id, limit=limit)

        # Generate query embedding
        embedding_str = self._get_query_embedding(query)

        # Run BM25 and vector searches in parallel
        fetch_limit = limit * 2  # Fetch more to improve fusion quality

        bm25_results, vector_results = await asyncio.gather(
            self._bm25_search_notes(db, query, user_id, fetch_limit),
            self._vector_search_notes(db, embedding_str, user_id, fetch_limit),
            return_exceptions=True,
        )

        # Handle exceptions
        if isinstance(bm25_results, Exception):
            logger.warning("bm25_search_exception", error=str(bm25_results)[:100])
            bm25_results = []
        if isinstance(vector_results, Exception):
            logger.warning("vector_search_exception", error=str(vector_results)[:100])
            vector_results = []

        # Fuse results with RRF
        fused = fuse_results(
            bm25_results,
            vector_results,
            bm25_weight=bm25_weight,
            vector_weight=vector_weight,
            limit=limit,
        )

        results = [
            HybridSearchResult(
                id=r["id"],
                title=r.get("title"),
                content=r.get("content", "")[:500],
                bm25_rank=r["bm25_rank"],
                bm25_score=r["bm25_score"],
                vector_rank=r["vector_rank"],
                vector_score=r["vector_score"],
                hybrid_score=r["hybrid_score"],
            )
            for r in fused
        ]

        logger.info(
            "hybrid_search_notes_complete",
            query=query[:50],
            results=len(results),
            bm25_count=len(bm25_results),
            vector_count=len(vector_results),
        )

        return results

    async def search_flashcards(
        self,
        db: AsyncSession,
        query: str,
        user_id: int,
        limit: int = 10,
        bm25_weight: float = 0.5,
        vector_weight: float = 0.5,
    ) -> List[FlashcardSearchResult]:
        """
        Hybrid search flashcards using parallel BM25 + vector with RRF fusion.

        Args:
            db: Database session
            query: Search query text
            user_id: User ID to filter flashcards
            limit: Maximum results to return
            bm25_weight: Weight for BM25 scores (0-1)
            vector_weight: Weight for vector scores (0-1)

        Returns:
            List of FlashcardSearchResult ordered by hybrid score
        """
        logger.info("hybrid_search_flashcards_start", query=query[:50], user_id=user_id)

        # Generate query embedding
        embedding_str = self._get_query_embedding(query)

        # Run BM25 and vector searches in parallel
        fetch_limit = limit * 2

        bm25_results, vector_results = await asyncio.gather(
            self._bm25_search_flashcards(db, query, user_id, fetch_limit),
            self._vector_search_flashcards(db, embedding_str, user_id, fetch_limit),
            return_exceptions=True,
        )

        # Handle exceptions
        if isinstance(bm25_results, Exception):
            logger.warning("bm25_flashcards_exception", error=str(bm25_results)[:100])
            bm25_results = []
        if isinstance(vector_results, Exception):
            logger.warning("vector_flashcards_exception", error=str(vector_results)[:100])
            vector_results = []

        # Fuse results with RRF
        fused = fuse_results(
            bm25_results,
            vector_results,
            bm25_weight=bm25_weight,
            vector_weight=vector_weight,
            limit=limit,
        )

        results = [
            FlashcardSearchResult(
                id=r["id"],
                front_text=r.get("front_text", ""),
                back_text=r.get("back_text", ""),
                deck_id=r.get("deck_id", 0),
                bm25_rank=r["bm25_rank"],
                bm25_score=r["bm25_score"],
                vector_rank=r["vector_rank"],
                vector_score=r["vector_score"],
                hybrid_score=r["hybrid_score"],
            )
            for r in fused
        ]

        logger.info(
            "hybrid_search_flashcards_complete",
            query=query[:50],
            results=len(results),
            bm25_count=len(bm25_results),
            vector_count=len(vector_results),
        )

        return results

    # ============================================
    # CHAT MESSAGE SEARCH
    # ============================================

    async def _bm25_search_chat_messages(
        self, db: AsyncSession, query: str, user_id: int, limit: int
    ) -> List[Dict[str, Any]]:
        """Execute BM25 keyword search on chat messages."""
        try:
            result = await db.execute(
                text("""
                    SELECT 
                        m.id,
                        m.session_id,
                        m.content,
                        m.role,
                        s.title as session_title,
                        pdb.score(m.id) AS score
                    FROM developer_schema.chat_messages m
                    INNER JOIN developer_schema.chat_sessions s ON m.session_id = s.id
                    WHERE 
                        s.user_id = :user_id
                        AND m.role = 'assistant'
                        AND m.is_active = true
                        AND m.content @@@ :query
                    ORDER BY pdb.score(m.id) DESC
                    LIMIT :limit
                """),
                {"query": query, "user_id": user_id, "limit": limit},
            )
            rows = result.fetchall()
            return [
                {
                    "id": r.id,
                    "session_id": r.session_id,
                    "content": r.content,
                    "role": r.role,
                    "session_title": r.session_title,
                    "score": r.score,
                }
                for r in rows
            ]
        except Exception as e:
            logger.warning("bm25_search_chat_failed", error=str(e)[:100])
            return []

    async def _vector_search_chat_messages(
        self, db: AsyncSession, embedding_str: str, user_id: int, limit: int
    ) -> List[Dict[str, Any]]:
        """Execute vector semantic search on chat messages."""
        try:
            result = await db.execute(
                text("""
                    SELECT 
                        m.id,
                        m.session_id,
                        m.content,
                        m.role,
                        s.title as session_title,
                        (1 - (m.embedding <=> CAST(:embedding AS vector(384))))::FLOAT AS score
                    FROM developer_schema.chat_messages m
                    INNER JOIN developer_schema.chat_sessions s ON m.session_id = s.id
                    WHERE 
                        s.user_id = :user_id
                        AND m.role = 'assistant'
                        AND m.is_active = true
                        AND m.embedding IS NOT NULL
                    ORDER BY m.embedding <=> CAST(:embedding AS vector(384))
                    LIMIT :limit
                """),
                {"embedding": embedding_str, "user_id": user_id, "limit": limit},
            )
            rows = result.fetchall()
            return [
                {
                    "id": r.id,
                    "session_id": r.session_id,
                    "content": r.content,
                    "role": r.role,
                    "session_title": r.session_title,
                    "score": r.score,
                }
                for r in rows
            ]
        except Exception as e:
            logger.warning("vector_search_chat_failed", error=str(e)[:100])
            return []

    async def search_chat_messages(
        self,
        db: AsyncSession,
        query: str,
        user_id: int,
        limit: int = 10,
        bm25_weight: float = 0.5,
        vector_weight: float = 0.5,
    ) -> List[ChatMessageSearchResult]:
        """
        Hybrid search chat messages using parallel BM25 + vector with RRF fusion.

        Only searches assistant messages (which contain Q+A pair embeddings).

        Args:
            db: Database session
            query: Search query text
            user_id: User ID to filter messages
            limit: Maximum results to return
            bm25_weight: Weight for BM25 scores (0-1)
            vector_weight: Weight for vector scores (0-1)

        Returns:
            List of ChatMessageSearchResult ordered by hybrid score
        """
        logger.info("hybrid_search_chat_start", query=query[:50], user_id=user_id)

        # Generate query embedding
        embedding_str = self._get_query_embedding(query)

        # Run BM25 and vector searches in parallel
        fetch_limit = limit * 2

        bm25_results, vector_results = await asyncio.gather(
            self._bm25_search_chat_messages(db, query, user_id, fetch_limit),
            self._vector_search_chat_messages(db, embedding_str, user_id, fetch_limit),
            return_exceptions=True,
        )

        # Handle exceptions
        if isinstance(bm25_results, Exception):
            logger.warning("bm25_chat_exception", error=str(bm25_results)[:100])
            bm25_results = []
        if isinstance(vector_results, Exception):
            logger.warning("vector_chat_exception", error=str(vector_results)[:100])
            vector_results = []

        # Fuse results with RRF
        fused = fuse_results(
            bm25_results,
            vector_results,
            bm25_weight=bm25_weight,
            vector_weight=vector_weight,
            limit=limit,
        )

        results = [
            ChatMessageSearchResult(
                id=r["id"],
                session_id=r.get("session_id", 0),
                content=r.get("content", "")[:500],
                role=r.get("role", "assistant"),
                session_title=r.get("session_title"),
                bm25_rank=r["bm25_rank"],
                bm25_score=r["bm25_score"],
                vector_rank=r["vector_rank"],
                vector_score=r["vector_score"],
                hybrid_score=r["hybrid_score"],
            )
            for r in fused
        ]

        logger.info(
            "hybrid_search_chat_complete",
            query=query[:50],
            results=len(results),
            bm25_count=len(bm25_results),
            vector_count=len(vector_results),
        )

        return results


# Singleton instance
_hybrid_search_service: Optional[HybridSearchService] = None


def get_hybrid_search_service() -> HybridSearchService:
    """Get singleton instance of HybridSearchService."""
    global _hybrid_search_service
    if _hybrid_search_service is None:
        _hybrid_search_service = HybridSearchService()
    return _hybrid_search_service
