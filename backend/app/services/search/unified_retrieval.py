"""
Unified Retrieval Service - Routes queries to PostgreSQL or Qdrant.

Hybrid Architecture:
- Notes/Flashcards: PostgreSQL (pgvector) with BM25+vector hybrid search
- Documents: Qdrant (existing RAG pipeline) with chunking

This service provides a single interface for retrieval that automatically
routes to the appropriate backend based on content type.
"""

import structlog
from typing import List, Dict, Any, Optional
from enum import Enum
from dataclasses import dataclass
from sqlalchemy.ext.asyncio import AsyncSession

logger = structlog.get_logger(__name__)


class ContentType(str, Enum):
    """Content types supported by unified retrieval."""

    NOTE = "note"
    FLASHCARD = "flashcard"
    DOCUMENT = "document"
    ALL = "all"


@dataclass
class RetrievalResult:
    """Unified retrieval result."""

    id: int
    content_type: ContentType
    title: str
    content: str
    score: float
    metadata: Dict[str, Any]
    source: str  # "postgresql" or "qdrant"


class UnifiedRetrievalService:
    """
    Unified retrieval across PostgreSQL and Qdrant.

    Routes queries based on content type:
    - Notes/Flashcards → PostgreSQL (pgvector hybrid search)
    - Documents → Qdrant (RAG pipeline)

    Usage:
        results = await UnifiedRetrievalService.retrieve(
            user_id=1,
            query="machine learning",
            db=session,
            content_types=[ContentType.NOTE, ContentType.DOCUMENT],
            limit=20
        )
    """

    @staticmethod
    async def retrieve(
        user_id: int,
        query: str,
        db: AsyncSession,
        query_embedding: Optional[List[float]] = None,
        content_types: Optional[List[ContentType]] = None,
        limit: int = 20,
        search_mode: str = "hybrid",
    ) -> List[RetrievalResult]:
        """
        Retrieve content from appropriate backends.

        Args:
            user_id: User ID
            query: Search query
            db: Database session
            query_embedding: Optional pre-computed embedding (384-dim)
            content_types: Types to search (default: all)
            limit: Max results per type
            search_mode: "bm25", "semantic", or "hybrid"

        Returns:
            List of RetrievalResult, sorted by score
        """
        if content_types is None:
            content_types = [ContentType.NOTE, ContentType.FLASHCARD, ContentType.DOCUMENT]

        if ContentType.ALL in content_types:
            content_types = [ContentType.NOTE, ContentType.FLASHCARD, ContentType.DOCUMENT]

        all_results: List[RetrievalResult] = []

        # Route to PostgreSQL for notes
        if ContentType.NOTE in content_types:
            pg_notes = await UnifiedRetrievalService._retrieve_from_postgres(
                user_id=user_id,
                query=query,
                db=db,
                query_embedding=query_embedding,
                content_type=ContentType.NOTE,
                limit=limit,
                search_mode=search_mode,
            )
            all_results.extend(pg_notes)

        # Route to PostgreSQL for flashcards
        if ContentType.FLASHCARD in content_types:
            pg_flashcards = await UnifiedRetrievalService._retrieve_from_postgres(
                user_id=user_id,
                query=query,
                db=db,
                query_embedding=query_embedding,
                content_type=ContentType.FLASHCARD,
                limit=limit,
                search_mode=search_mode,
            )
            all_results.extend(pg_flashcards)

        # Route to Qdrant for documents
        if ContentType.DOCUMENT in content_types:
            qdrant_docs = await UnifiedRetrievalService._retrieve_from_qdrant(
                user_id=user_id,
                query=query,
                query_embedding=query_embedding,
                limit=limit,
            )
            all_results.extend(qdrant_docs)

        # Sort by score descending
        all_results.sort(key=lambda x: x.score, reverse=True)

        logger.info(
            "unified_retrieval_complete",
            user_id=user_id,
            query_length=len(query),
            result_count=len(all_results),
            content_types=[ct.value for ct in content_types],
        )

        return all_results[:limit]

    @staticmethod
    async def _retrieve_from_postgres(
        user_id: int,
        query: str,
        db: AsyncSession,
        query_embedding: Optional[List[float]],
        content_type: ContentType,
        limit: int,
        search_mode: str,
    ) -> List[RetrievalResult]:
        """Retrieve from PostgreSQL using hybrid search."""
        from app.services.search.hybrid_v2 import HybridSearchServiceV2, SearchMode

        results: List[RetrievalResult] = []

        try:
            # Map mode
            mode = SearchMode.HYBRID
            if search_mode == "bm25":
                mode = SearchMode.BM25
            elif search_mode == "semantic":
                mode = SearchMode.SEMANTIC

            if content_type == ContentType.NOTE:
                # Use hybrid search for notes
                pg_results = await HybridSearchServiceV2.hybrid_search_notes(
                    user_id=user_id,
                    query=query,
                    db=db,
                    query_embedding=query_embedding,
                    limit=limit,
                    search_mode=mode,
                )

                for r in pg_results:
                    results.append(
                        RetrievalResult(
                            id=r.get("id", 0),
                            content_type=ContentType.NOTE,
                            title=r.get("title", ""),
                            content=r.get("content", ""),
                            score=r.get("rrf_score", 0.0),
                            metadata={
                                "bm25_rank": r.get("bm25_rank"),
                                "semantic_rank": r.get("semantic_rank"),
                                "headline": r.get("headline"),
                            },
                            source="postgresql",
                        )
                    )

            elif content_type == ContentType.FLASHCARD:
                # Use unified search for flashcards (BM25)
                from app.services.search.fulltext import FullTextSearchService

                pg_results = await FullTextSearchService.search_flashcards_fts(
                    user_id=user_id,
                    query=query,
                    db=db,
                    limit=limit,
                )

                for r in pg_results:
                    results.append(
                        RetrievalResult(
                            id=r.get("id", 0),
                            content_type=ContentType.FLASHCARD,
                            title=r.get("front_text", ""),
                            content=r.get("back_text", ""),
                            score=r.get("relevance_score", 0.0),
                            metadata={
                                "deck_id": r.get("deck_id"),
                                "deck_name": r.get("deck_name"),
                                "headline": r.get("headline"),
                            },
                            source="postgresql",
                        )
                    )

        except Exception as e:
            logger.error(
                "postgres_retrieval_error",
                content_type=content_type.value,
                error=str(e),
                exc_info=True,
            )

        return results

    @staticmethod
    async def _retrieve_from_qdrant(
        user_id: int,
        query: str,
        query_embedding: Optional[List[float]],
        limit: int,
    ) -> List[RetrievalResult]:
        """Retrieve from Qdrant using existing RAG pipeline."""
        results: List[RetrievalResult] = []

        try:
            from app.core.ai.rag.synapse_bridge import SynapseBridge

            bridge = SynapseBridge()
            qdrant_data = await bridge.query_with_synapse_context(
                user_id=user_id,
                query=query,
                top_k=limit,
            )

            for chunk in qdrant_data.get("retrieved_chunks", []):
                metadata = chunk.get("metadata", {})
                results.append(
                    RetrievalResult(
                        id=metadata.get("source_id", 0),
                        content_type=ContentType.DOCUMENT,
                        title=metadata.get("title", "Document Chunk"),
                        content=chunk.get("content", "")[:500],
                        score=chunk.get("score", 0.0),
                        metadata={
                            "chunk_id": metadata.get("chunk_id"),
                            "source_type": metadata.get("source_type"),
                            "document_id": metadata.get("document_id"),
                        },
                        source="qdrant",
                    )
                )

        except Exception as e:
            logger.error("qdrant_retrieval_error", error=str(e), exc_info=True)

        return results

    @staticmethod
    async def retrieve_for_rag(
        user_id: int,
        query: str,
        db: AsyncSession,
        top_k: int = 10,
    ) -> Dict[str, Any]:
        """
        Retrieve content formatted for RAG/LLM context.

        Returns chunks suitable for LLM prompts with source attribution.
        """
        from app.core.ai.embeddings.boundary import get_embedder

        # Generate embedding for query (uses boundary singleton)
        embedder = get_embedder()
        query_embedding = embedder.encode(query).tolist()

        # Retrieve from all sources
        results = await UnifiedRetrievalService.retrieve(
            user_id=user_id,
            query=query,
            db=db,
            query_embedding=query_embedding,
            content_types=[ContentType.NOTE, ContentType.DOCUMENT],
            limit=top_k,
            search_mode="hybrid",
        )

        # Format for RAG
        context_chunks = []
        for r in results:
            context_chunks.append(
                {
                    "content": r.content,
                    "title": r.title,
                    "source_type": r.content_type.value,
                    "source_id": r.id,
                    "score": r.score,
                    "source": r.source,
                }
            )

        return {
            "query": query,
            "chunks": context_chunks,
            "total_retrieved": len(results),
            "sources": {
                "postgresql": len([r for r in results if r.source == "postgresql"]),
                "qdrant": len([r for r in results if r.source == "qdrant"]),
            },
        }
