"""
Hybrid Search Service V2 - PostgreSQL-Native BM25 + Semantic Search.

Uses:
- pg_search (ParadeDB) for BM25 full-text search
- pgvector/pgvectorscale for semantic vector search
- Reciprocal Rank Fusion (RRF) for hybrid ranking
- search_conversations_v3 for chat message search

This service wraps PostgreSQL search functions directly.
All search logic lives in SQL for maximum performance.
"""

import logging
from typing import List, Dict, Any, Optional
from enum import Enum

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.ai.embeddings.boundary import EMBEDDING_DIM
from app.services.search.result_types import (
    HybridSearchResult,
    FlashcardSearchResult,
    ChatMessageSearchResult,
)
import re

logger = logging.getLogger(__name__)

def _sanitize_query(query: str) -> str:
    """Sanitize query for ParadeDB/Tantivy to prevent parsing errors."""
    if not query:
        return query
    # Replace ParadeDB/Tantivy special characters with space
    return re.sub(r'[+\-=&|><!(){}\[\]^"~*?:\/\\]', ' ', query)


class SearchMode(str, Enum):
    """Search mode options."""

    BM25 = "bm25"  # Full-text search only (pg_search)
    SEMANTIC = "semantic"  # Vector search only (pgvector)
    HYBRID = "hybrid"  # Combined BM25 + semantic with RRF


class HybridSearchServiceV2:
    """
    PostgreSQL-native hybrid search using pg_search BM25 + pgvector.

    Features:
    - BM25 ranking via ParadeDB pg_search
    - Semantic similarity via pgvector DiskANN indexes
    - Reciprocal Rank Fusion (RRF) for hybrid ranking
    - Chat search via search_conversations_v3
    - Configurable search modes: bm25, semantic, hybrid
    - Adjustable weights for BM25 vs semantic results

    All search logic is in PostgreSQL for maximum performance.
    """

    # =========================================================================
    # Notes Search
    # =========================================================================

    @staticmethod
    async def hybrid_search_notes(
        user_id: int,
        query: str,
        db: AsyncSession,
        query_embedding: Optional[List[float]] = None,
        limit: int = 20,
        search_mode: SearchMode = SearchMode.HYBRID,
        bm25_weight: float = 1.0,
        semantic_weight: float = 1.0,
        k: int = 60,
    ) -> List[Dict[str, Any]]:
        """
        Hybrid search on notes using BM25 and/or semantic search.

        Calls: developer_schema.hybrid_search_notes()

        Args:
            user_id: User ID to filter by
            query: Text search query
            db: Database session
            query_embedding: Optional embedding vector for semantic search
            limit: Maximum results (default 20)
            search_mode: bm25|semantic|hybrid (default hybrid)
            bm25_weight: Weight for BM25 results in RRF (default 1.0)
            semantic_weight: Weight for semantic results in RRF (default 1.0)
            k: RRF smoothing constant (default 60)

        Returns:
            List of dicts with ranked search results
        """
        if not query or not query.strip():
            logger.warning(f"Empty query for user {user_id}")
            return []
            
        safe_query = _sanitize_query(query)

        # For semantic/hybrid mode, embedding is required
        if search_mode in (SearchMode.SEMANTIC, SearchMode.HYBRID):
            if query_embedding is None:
                logger.warning(f"No embedding for semantic search, falling back to BM25")
                search_mode = SearchMode.BM25

        logger.debug(
            f"Hybrid search [{search_mode.value}]: '{query[:50]}...' "
            f"for user {user_id}, weights: bm25={bm25_weight}, semantic={semantic_weight}"
        )

        try:
            # Convert embedding to PostgreSQL vector format
            embedding_param = None
            if query_embedding is not None:
                embedding_param = f"[{','.join(map(str, query_embedding))}]"

            result = await db.execute(
                text(f"""
                    SELECT * FROM developer_schema.hybrid_search_notes(
                        :user_id, 
                        :query, 
                        :embedding\:\:vector({EMBEDDING_DIM}),
                        :limit, 
                        :k, 
                        :search_mode,
                        :bm25_weight,
                        :semantic_weight
                    )
                """),
                {
                    "user_id": user_id,
                    "query": safe_query,
                    "embedding": embedding_param,
                    "limit": limit,
                    "k": k,
                    "search_mode": search_mode.value,
                    "bm25_weight": bm25_weight,
                    "semantic_weight": semantic_weight,
                },
            )

            rows = result.mappings().all()

            # Format results for API
            results = []
            for row in rows:
                results.append(
                    {
                        "type": "note",
                        "id": row["id"],
                        "title": row["title"],
                        "content": row["content_preview"],
                        "bm25_rank": row["bm25_rank"],
                        "semantic_rank": row["semantic_rank"],
                        "rrf_score": float(row["rrf_score"]) if row["rrf_score"] else 0.0,
                        "headline": row["snippet"],
                        "search_mode": search_mode.value,
                    }
                )

            logger.info(
                f"Hybrid search: {len(results)} results for '{query[:30]}...' "
                f"[mode={search_mode.value}]"
            )
            return results

        except Exception as e:
            logger.error(f"Hybrid search error: {e}", exc_info=True)
            try:
                await db.rollback()
            except Exception:
                pass
            return []

    @staticmethod
    async def search_notes_typed(
        user_id: int,
        query: str,
        db: AsyncSession,
        query_embedding: Optional[List[float]] = None,
        limit: int = 20,
        search_mode: SearchMode = SearchMode.HYBRID,
        bm25_weight: float = 1.0,
        semantic_weight: float = 1.0,
    ) -> List[HybridSearchResult]:
        """
        Typed wrapper returning HybridSearchResult dataclasses.

        Used by adapters in the unified search bus which expect dataclass
        instances rather than raw dicts.
        """
        raw = await HybridSearchServiceV2.hybrid_search_notes(
            user_id=user_id,
            query=query,
            db=db,
            query_embedding=query_embedding,
            limit=limit,
            search_mode=search_mode,
            bm25_weight=bm25_weight,
            semantic_weight=semantic_weight,
        )
        return [
            HybridSearchResult(
                id=r["id"],
                title=r.get("title"),
                content=r.get("content", ""),
                bm25_rank=r.get("bm25_rank", 0),
                bm25_score=0.0,  # SQL RRF doesn't expose raw BM25 score
                vector_rank=r.get("semantic_rank", 0),
                vector_score=0.0,  # SQL RRF doesn't expose raw vector score
                hybrid_score=r.get("rrf_score", 0.0),
            )
            for r in raw
        ]

    # =========================================================================
    # Flashcard Search
    # =========================================================================

    @staticmethod
    async def hybrid_search_flashcards(
        user_id: int,
        query: str,
        db: AsyncSession,
        query_embedding: Optional[List[float]] = None,
        limit: int = 20,
        search_mode: SearchMode = SearchMode.HYBRID,
        bm25_weight: float = 1.0,
        semantic_weight: float = 1.0,
        k: int = 60,
    ) -> List[Dict[str, Any]]:
        """
        Search flashcards using BM25 via search_flashcards_fts.

        Calls: developer_schema.search_flashcards_fts()

        Note: No hybrid_search_flashcards SQL function exists yet.
        Currently uses BM25-only search via search_flashcards_fts.
        Semantic/hybrid parameters are accepted for future compatibility
        when a proper hybrid flashcard SQL function is created.

        Args:
            user_id: User ID (owner of the decks)
            query: Text search query
            db: Database session
            query_embedding: Reserved for future hybrid search
            limit: Maximum results (default 20)
            search_mode: Currently uses BM25 regardless (FTS-only backing)
            bm25_weight: Reserved for future hybrid search
            semantic_weight: Reserved for future hybrid search
            k: Reserved for future RRF smoothing constant

        Returns:
            List of dicts with ranked flashcard results
        """
        if not query or not query.strip():
            logger.warning(f"Empty flashcard query for user {user_id}")
            return []
            
        safe_query = _sanitize_query(query)

        logger.debug(f"Flashcard search (BM25): '{query[:50]}...' for user {user_id}")

        try:
            result = await db.execute(
                text("""
                    SELECT * FROM developer_schema.search_flashcards_fts(
                        :user_id, :query, :limit
                    )
                """),
                {"user_id": user_id, "query": safe_query, "limit": limit},
            )

            rows = result.mappings().all()

            results = []
            for row in rows:
                results.append(
                    {
                        "type": "flashcard",
                        "id": row["id"],
                        "front_text": row["front_text"],
                        "back_text": row["back_text"],
                        "deck_id": row["deck_id"],
                        "bm25_rank": 0,
                        "semantic_rank": 0,
                        "rrf_score": float(row["rank"]) if row.get("rank") else 0.0,
                        "headline": row.get("headline"),
                        "search_mode": "bm25",  # FTS-only backing
                    }
                )

            logger.info(f"Flashcard search: {len(results)} results for '{query[:30]}...'")
            return results

        except Exception as e:
            logger.error(f"Flashcard search error: {e}", exc_info=True)
            try:
                await db.rollback()
            except Exception:
                pass
            return []

    @staticmethod
    async def search_flashcards_typed(
        user_id: int,
        query: str,
        db: AsyncSession,
        query_embedding: Optional[List[float]] = None,
        limit: int = 20,
        search_mode: SearchMode = SearchMode.HYBRID,
        bm25_weight: float = 1.0,
        semantic_weight: float = 1.0,
    ) -> List[FlashcardSearchResult]:
        """
        Typed wrapper returning FlashcardSearchResult dataclasses.

        Used by adapters in the unified search bus.
        """
        raw = await HybridSearchServiceV2.hybrid_search_flashcards(
            user_id=user_id,
            query=query,
            db=db,
            query_embedding=query_embedding,
            limit=limit,
            search_mode=search_mode,
            bm25_weight=bm25_weight,
            semantic_weight=semantic_weight,
        )
        return [
            FlashcardSearchResult(
                id=r["id"],
                front_text=r.get("front_text", ""),
                back_text=r.get("back_text", ""),
                deck_id=r.get("deck_id", 0),
                bm25_rank=r.get("bm25_rank", 0),
                bm25_score=0.0,
                vector_rank=r.get("semantic_rank", 0),
                vector_score=0.0,
                hybrid_score=r.get("rrf_score", 0.0),
            )
            for r in raw
        ]

    # =========================================================================
    # Chat Message Search
    # =========================================================================

    @staticmethod
    async def search_chat_messages(
        user_id: int,
        query: str,
        db: AsyncSession,
        limit: int = 20,
    ) -> List[ChatMessageSearchResult]:
        """
        Search chat messages using the V3 multi-stage ranking pipeline.

        Calls: developer_schema.search_conversations_v3()

        The V3 function applies a 6-stage ranking cascade:
          Stage 1: Title exact match      (score: 10.0)
          Stage 2: Title prefix match     (score: 8.0)
          Stage 3: Title substring match  (score: 6.0)
          Stage 4: Title fuzzy match      (score: 4.0)
          Stage 5: Message BM25 match     (score: varies)
          Stage 6: Message vector match   (score: varies)

        User scoping is enforced at the SQL level (user_id parameter).
        The returned relevance_score is a composite from the matching stage,
        NOT a separate BM25/vector split. Dataclass bm25/vector fields are
        zeroed for adapter compatibility.

        Args:
            user_id: User ID (enforced in SQL query)
            query: Search query text
            db: Database session
            limit: Maximum results to return

        Returns:
            List of ChatMessageSearchResult ordered by relevance
        """
        if not query or not query.strip():
            logger.warning(f"Empty chat query for user {user_id}")
            return []

        safe_query = _sanitize_query(query)

        logger.debug(f"Chat search: '{query[:50]}...' for user {user_id}")

        try:
            result = await db.execute(
                text(
                    "SELECT * FROM developer_schema.search_conversations_v3("
                    ":user_id, :query, :limit)"
                ),
                {"user_id": user_id, "query": safe_query, "limit": limit},
            )

            rows = result.fetchall()

            results = [
                ChatMessageSearchResult(
                    id=row.message_id if row.message_id else 0,
                    session_id=row.session_id,
                    content=(row.message_content or "")[:500],
                    role=row.message_role or "assistant",
                    session_title=row.session_title,
                    bm25_rank=0,
                    bm25_score=0.0,
                    vector_rank=0,
                    vector_score=0.0,
                    hybrid_score=float(row.relevance_score or 0.0),
                )
                for row in rows
            ]

            logger.info(f"Chat search: {len(results)} results for '{query[:30]}...'")
            return results

        except Exception as e:
            logger.error(f"Chat search error: {e}", exc_info=True)
            try:
                await db.rollback()
            except Exception:
                pass
            return []

    # =========================================================================
    # Convenience: search with auto-embedding
    # =========================================================================

    @staticmethod
    async def search_with_embeddings(
        user_id: int,
        query: str,
        db: AsyncSession,
        embedder: Any,  # EmbedderService or similar
        limit: int = 20,
        search_mode: SearchMode = SearchMode.HYBRID,
        bm25_weight: float = 1.0,
        semantic_weight: float = 1.0,
    ) -> List[Dict[str, Any]]:
        """
        High-level search that generates embeddings automatically.

        Args:
            user_id: User ID
            query: Search query
            db: Database session
            embedder: Embedding service with embed() method
            limit: Max results
            search_mode: Search strategy
            bm25_weight: BM25 weight
            semantic_weight: Semantic weight

        Returns:
            List of ranked search results
        """
        # Generate embedding for semantic search
        query_embedding = None
        if search_mode in (SearchMode.SEMANTIC, SearchMode.HYBRID):
            try:
                if hasattr(embedder, "embed"):
                    query_embedding = embedder.embed(query)
                elif hasattr(embedder, "embed_query"):
                    query_embedding = embedder.embed_query(query)
                else:
                    logger.warning("Embedder has no embed() method")
            except Exception as e:
                logger.error(f"Embedding generation failed: {e}")
                search_mode = SearchMode.BM25

        return await HybridSearchServiceV2.hybrid_search_notes(
            user_id=user_id,
            query=query,
            db=db,
            query_embedding=query_embedding,
            limit=limit,
            search_mode=search_mode,
            bm25_weight=bm25_weight,
            semantic_weight=semantic_weight,
        )

    # =========================================================================
    # Unified BM25-only search (all entity types)
    # =========================================================================

    @staticmethod
    async def unified_hybrid_search(
        user_id: int,
        query: str,
        db: AsyncSession,
        query_embedding: Optional[List[float]] = None,
        limit: int = 20,
        search_mode: SearchMode = SearchMode.HYBRID,
    ) -> List[Dict[str, Any]]:
        """
        Unified search using pg_search BM25 for all content types.

        Calls: developer_schema.unified_search()

        For now this uses BM25 only. Full hybrid with embeddings
        will require embedding columns on flashcards too.
        """
        if not query or not query.strip():
            return []
            
        safe_query = _sanitize_query(query)

        logger.debug(f"Unified hybrid search: '{query}' for user {user_id}")

        try:
            result = await db.execute(
                text("""
                    SELECT * FROM developer_schema.unified_search(
                        :user_id, :query, :limit
                    )
                """),
                {"user_id": user_id, "query": safe_query, "limit": limit},
            )

            rows = result.mappings().all()

            results = []
            for row in rows:
                results.append(
                    {
                        "type": row["result_type"],
                        "id": row["id"],
                        "title": row["title"],
                        "content": row["content"],
                        "headline": row["headline"],
                        "relevance_score": float(row["relevance_score"])
                        if row["relevance_score"]
                        else 0.0,
                        "metadata": row["metadata"],
                        "created_at": row["created_at"],
                        "updated_at": row["updated_at"],
                    }
                )

            logger.info(f"Unified hybrid search: {len(results)} results for '{query}'")
            return results

        except Exception as e:
            logger.error(f"Unified hybrid search error: {e}", exc_info=True)
            return []
