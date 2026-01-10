"""PostgreSQL Hybrid Search Service.

Combines BM25 (keyword) + Vector (semantic) search using Reciprocal Rank Fusion.
Leverages pg_search (ParadeDB) + pgvector extensions.
"""

from typing import List, Optional
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


class HybridSearchService:
    """
    PostgreSQL-native hybrid search using BM25 + vector similarity.

    Uses:
    - pg_search (ParadeDB) for BM25 keyword search
    - pgvector for semantic vector search
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
        Hybrid search notes using BM25 + vector similarity.

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

        # Execute hybrid search SQL function
        result = await db.execute(
            text("""
                SELECT * FROM developer_schema.hybrid_search_notes(
                    :query_text,
                    CAST(:embedding AS vector(384)),
                    :user_id,
                    :result_limit,
                    :bm25_weight,
                    :vector_weight,
                    60
                )
            """),
            {
                "query_text": query,
                "embedding": embedding_str,
                "user_id": user_id,
                "result_limit": limit,
                "bm25_weight": bm25_weight,
                "vector_weight": vector_weight,
            },
        )

        rows = result.fetchall()

        results = [
            HybridSearchResult(
                id=row.id,
                title=row.title,
                content=row.content[:500] if row.content else "",
                bm25_rank=row.bm25_rank,
                bm25_score=row.bm25_score,
                vector_rank=row.vector_rank,
                vector_score=row.vector_score,
                hybrid_score=row.hybrid_score,
            )
            for row in rows
        ]

        logger.info("hybrid_search_notes_complete", query=query[:50], results=len(results))

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
        Hybrid search flashcards using BM25 + vector similarity.

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

        # Execute hybrid search SQL function
        result = await db.execute(
            text("""
                SELECT * FROM developer_schema.hybrid_search_flashcards(
                    :query_text,
                    CAST(:embedding AS vector(384)),
                    :user_id,
                    :result_limit,
                    :bm25_weight,
                    :vector_weight,
                    60
                )
            """),
            {
                "query_text": query,
                "embedding": embedding_str,
                "user_id": user_id,
                "result_limit": limit,
                "bm25_weight": bm25_weight,
                "vector_weight": vector_weight,
            },
        )

        rows = result.fetchall()

        results = [
            FlashcardSearchResult(
                id=row.id,
                front_text=row.front_text,
                back_text=row.back_text,
                deck_id=row.deck_id,
                bm25_rank=row.bm25_rank,
                bm25_score=row.bm25_score,
                vector_rank=row.vector_rank,
                vector_score=row.vector_score,
                hybrid_score=row.hybrid_score,
            )
            for row in rows
        ]

        logger.info("hybrid_search_flashcards_complete", query=query[:50], results=len(results))

        return results


# Singleton instance
_hybrid_search_service: Optional[HybridSearchService] = None


def get_hybrid_search_service() -> HybridSearchService:
    """Get singleton instance of HybridSearchService."""
    global _hybrid_search_service
    if _hybrid_search_service is None:
        _hybrid_search_service = HybridSearchService()
    return _hybrid_search_service
