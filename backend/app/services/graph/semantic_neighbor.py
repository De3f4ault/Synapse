"""
Semantic Neighbor Service — Read-Only Neighborhood Queries

Phase Q2.3: Find semantically related entities using pgvector.

ARCHITECTURAL INVARIANT:
- This service NEVER mutates state
- Embeddings define SEMANTIC NEIGHBORHOODS, not authority or scheduling
- Returns only IDs + similarity scores for advisory purposes
- Used for: attention routing, cross-entity surfacing, priority biasing
- Never for: interval modification, ease adjustment, mastery claims

Usage:
    neighbors = await SemanticNeighborService.get_neighbors_for_question(
        db, question_embedding, user_id, entity_types=["flashcard", "note"]
    )
"""

from typing import List, Optional, Literal
from dataclasses import dataclass
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.core.ai.embeddings.boundary import EMBEDDING_DIM

logger = structlog.get_logger(__name__)


# =============================================================================
# Data Types
# =============================================================================


@dataclass
class SemanticNeighbor:
    """A semantically related entity (read-only advisory data)."""

    id: int
    entity_type: Literal["flashcard", "note", "question"]
    content_preview: str
    similarity: float  # 0.0 to 1.0 (cosine similarity)


def format_vector(embedding: List[float]) -> str:
    """Format embedding list as pgvector string literal."""
    return "[" + ",".join(str(x) for x in embedding) + "]"


# =============================================================================
# Semantic Neighbor Service
# =============================================================================


class SemanticNeighborService:
    """
    Find semantically related entities using pgvector.

    INVARIANT: This service NEVER mutates state.
    It only returns IDs + similarity scores for advisory purposes.
    """

    @staticmethod
    async def get_neighbors_for_embedding(
        db: AsyncSession,
        embedding: List[float],
        user_id: int,
        entity_types: Optional[List[str]] = None,
        limit: int = 10,
        min_similarity: float = 0.3,
    ) -> List[SemanticNeighbor]:
        """
        Find entities semantically close to a given embedding.

        Uses pgvector <=> operator (cosine distance).

        Args:
            db: Database session
            embedding: Embedding vector to search around
            user_id: User ID for data isolation
            entity_types: List of types to include ["flashcard", "note", "question"]
            limit: Max neighbors to return per type
            min_similarity: Minimum similarity threshold (0.0-1.0)

        Returns:
            List of SemanticNeighbor objects sorted by similarity descending
        """
        if entity_types is None:
            entity_types = ["flashcard", "note"]

        if not embedding:
            return []

        neighbors: List[SemanticNeighbor] = []
        embedding_str = format_vector(embedding)

        # Query flashcards
        if "flashcard" in entity_types:
            try:
                result = await db.execute(
                    text(f"""
                    SELECT 
                        f.id, 
                        'flashcard' as entity_type,
                        LEFT(f.front_text, 100) as content_preview,
                        1.0 - (f.content_embedding <=> :embedding::vector({EMBEDDING_DIM})) as similarity
                    FROM flashcards f
                    JOIN decks d ON d.id = f.deck_id
                    WHERE d.user_id = :user_id
                      AND f.content_embedding IS NOT NULL
                      AND f.deleted_at IS NULL
                      AND 1.0 - (f.content_embedding <=> :embedding::vector({EMBEDDING_DIM})) >= :min_sim
                    ORDER BY f.content_embedding <=> :embedding::vector({EMBEDDING_DIM})
                    LIMIT :limit
                """),
                    {
                        "embedding": embedding_str,
                        "user_id": user_id,
                        "limit": limit,
                        "min_sim": min_similarity,
                    },
                )

                for row in result:
                    neighbors.append(
                        SemanticNeighbor(
                            id=row.id,
                            entity_type="flashcard",
                            content_preview=row.content_preview or "",
                            similarity=float(row.similarity),
                        )
                    )
            except Exception as e:
                logger.warning("flashcard_neighbor_query_failed", error=str(e))

        # Query notes
        if "note" in entity_types:
            try:
                result = await db.execute(
                    text(f"""
                    SELECT 
                        n.id, 
                        'note' as entity_type,
                        LEFT(n.title, 100) as content_preview,
                        1.0 - (n.embedding <=> :embedding::vector({EMBEDDING_DIM})) as similarity
                    FROM notes n
                    WHERE n.user_id = :user_id
                      AND n.embedding IS NOT NULL
                      AND n.deleted_at IS NULL
                      AND 1.0 - (n.embedding <=> :embedding::vector({EMBEDDING_DIM})) >= :min_sim
                    ORDER BY n.embedding <=> :embedding::vector({EMBEDDING_DIM})
                    LIMIT :limit
                """),
                    {
                        "embedding": embedding_str,
                        "user_id": user_id,
                        "limit": limit,
                        "min_sim": min_similarity,
                    },
                )

                for row in result:
                    neighbors.append(
                        SemanticNeighbor(
                            id=row.id,
                            entity_type="note",
                            content_preview=row.content_preview or "",
                            similarity=float(row.similarity),
                        )
                    )
            except Exception as e:
                logger.warning("note_neighbor_query_failed", error=str(e))

        # Query other quiz questions
        if "question" in entity_types:
            try:
                result = await db.execute(
                    text(f"""
                    SELECT 
                        qq.id, 
                        'question' as entity_type,
                        LEFT(qq.question_text, 100) as content_preview,
                        1.0 - (qq.prompt_embedding <=> :embedding::vector({EMBEDDING_DIM})) as similarity
                    FROM quiz_questions qq
                    JOIN quizzes q ON q.id = qq.quiz_id
                    WHERE q.user_id = :user_id
                      AND qq.prompt_embedding IS NOT NULL
                      AND 1.0 - (qq.prompt_embedding <=> :embedding::vector({EMBEDDING_DIM})) >= :min_sim
                    ORDER BY qq.prompt_embedding <=> :embedding::vector({EMBEDDING_DIM})
                    LIMIT :limit
                """),
                    {
                        "embedding": embedding_str,
                        "user_id": user_id,
                        "limit": limit,
                        "min_sim": min_similarity,
                    },
                )

                for row in result:
                    neighbors.append(
                        SemanticNeighbor(
                            id=row.id,
                            entity_type="question",
                            content_preview=row.content_preview or "",
                            similarity=float(row.similarity),
                        )
                    )
            except Exception as e:
                logger.warning("question_neighbor_query_failed", error=str(e))

        # Sort by similarity descending and limit total results
        neighbors.sort(key=lambda x: x.similarity, reverse=True)
        return neighbors[:limit]

    @staticmethod
    async def get_neighbors_for_question(
        db: AsyncSession,
        question_id: int,
        user_id: int,
        entity_types: Optional[List[str]] = None,
        limit: int = 10,
    ) -> List[SemanticNeighbor]:
        """
        Find entities semantically close to a quiz question.

        Convenience wrapper that fetches the question's embedding first.

        Args:
            db: Database session
            question_id: Quiz question ID to find neighbors for
            user_id: User ID for data isolation
            entity_types: List of types to include
            limit: Max neighbors to return

        Returns:
            List of SemanticNeighbor objects (excludes the source question)
        """
        from app.models.quiz_question import QuizQuestion
        from sqlalchemy import select

        # Fetch the question's embedding
        result = await db.execute(
            select(QuizQuestion.prompt_embedding).where(QuizQuestion.id == question_id)
        )
        row = result.first()

        if not row or not row.prompt_embedding:
            logger.debug("question_has_no_embedding", question_id=question_id)
            return []

        # Get neighbors
        neighbors = await SemanticNeighborService.get_neighbors_for_embedding(
            db, row.prompt_embedding, user_id, entity_types, limit + 1
        )

        # Exclude the source question itself
        neighbors = [
            n for n in neighbors if not (n.entity_type == "question" and n.id == question_id)
        ]

        return neighbors[:limit]
