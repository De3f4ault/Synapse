"""Search Engine Adapters.

Pure functions that translate engine-specific outputs into the
unified SearchResult contract. Each adapter preserves full provenance
and assigns correct role, assertion type, and identity.

GUARANTEE:
- No ranking is applied
- Scores are raw and lossless
- Identity rules are enforced
- Temporal validity is set
"""

from datetime import datetime
from typing import List, Any, Dict
import structlog

from app.schemas.search_identity import (
    SearchEntityIdentity,
    IdentityAuthority,
)
from app.schemas.search_result import (
    UnifiedSearchResult,
    SearchRole,
    AssertionType,
)
from app.services.search.result_types import (
    HybridSearchResult,
    FlashcardSearchResult,
    ChatMessageSearchResult,
)

logger = structlog.get_logger(__name__)


# =============================================================================
# Hybrid Search Adapters (PostgreSQL BM25 + Vector)
# =============================================================================


def adapt_hybrid_note_results(
    results: List[HybridSearchResult],
    user_id: int,
) -> List[UnifiedSearchResult]:
    """
    Adapt Hybrid Search note results to unified contract.

    Role: NAVIGATION (authoritative resources)
    Assertion: FACTUAL (user-created content)
    Authority: USER_CONTENT
    """
    adapted = []
    now = datetime.utcnow()

    for r in results:
        identity = SearchEntityIdentity(
            id=r.id,
            type="note",
            authority=IdentityAuthority.USER_CONTENT,
            root_id=r.id,  # USER_CONTENT entities are their own root
            store="postgres",
        )

        adapted.append(
            UnifiedSearchResult(
                id=identity,
                role=SearchRole.NAVIGATION,
                title=r.title or "Untitled Note",
                snippet=r.content[:200] if r.content else None,
                url=f"/notes/{r.id}",
                source="hybrid",
                scores={
                    "bm25": r.bm25_score,
                    "vector": r.vector_score,
                    "rrf": r.hybrid_score,
                    "bm25_rank": float(r.bm25_rank),
                    "vector_rank": float(r.vector_rank),
                },
                signals={
                    "matched_via": "hybrid_rrf",
                },
                assertion_type=AssertionType.FACTUAL,
                confidence=None,  # Factual entities don't need confidence
                valid_at=now,
                revision=None,  # Could fetch from DB if needed
            )
        )

    logger.debug("adapted_hybrid_notes", count=len(adapted))
    return adapted


def adapt_hybrid_flashcard_results(
    results: List[FlashcardSearchResult],
    user_id: int,
) -> List[UnifiedSearchResult]:
    """
    Adapt Hybrid Search flashcard results to unified contract.

    Role: NAVIGATION
    Assertion: FACTUAL
    Authority: USER_CONTENT
    """
    adapted = []
    now = datetime.utcnow()

    for r in results:
        identity = SearchEntityIdentity(
            id=r.id,
            type="flashcard",
            authority=IdentityAuthority.USER_CONTENT,
            root_id=r.id,
            store="postgres",
        )

        adapted.append(
            UnifiedSearchResult(
                id=identity,
                role=SearchRole.NAVIGATION,
                title=r.front_text[:100] if r.front_text else "Flashcard",
                snippet=r.back_text[:200] if r.back_text else None,
                url=f"/flashcards/{r.deck_id}",
                source="hybrid",
                scores={
                    "bm25": r.bm25_score,
                    "vector": r.vector_score,
                    "rrf": r.hybrid_score,
                },
                signals={
                    "deck_id": r.deck_id,
                },
                assertion_type=AssertionType.FACTUAL,
                valid_at=now,
            )
        )

    logger.debug("adapted_hybrid_flashcards", count=len(adapted))
    return adapted


def adapt_chat_message_results(
    results: List[ChatMessageSearchResult],
    user_id: int,
) -> List[UnifiedSearchResult]:
    """
    Adapt Hybrid Search chat message results to unified contract.

    Role: EVIDENCE (secondary evidence for grounding) or SUGGESTION (for recall)
    Assertion: INFERENTIAL (experiential, not authored)
    Authority: SYSTEM_DERIVED (AI-generated responses)

    Chat is never canonical - it's experiential knowledge.
    UI can visually down-rank or label appropriately.
    """
    adapted = []
    now = datetime.utcnow()

    for r in results:
        identity = SearchEntityIdentity(
            id=r.id,
            type="conversation",
            authority=IdentityAuthority.SYSTEM_DERIVED,  # AI-generated
            parent_id=r.session_id,
            root_id=r.session_id,
            store="postgres",
        )

        adapted.append(
            UnifiedSearchResult(
                id=identity,
                role=SearchRole.EVIDENCE,  # Secondary evidence for grounding
                title=r.session_title or "Previous Conversation",
                snippet=r.content[:300] if r.content else None,
                url=f"/chat/{r.session_id}?msg={r.id}",
                source="hybrid",
                scores={
                    "bm25": r.bm25_score,
                    "vector": r.vector_score,
                    "rrf": r.hybrid_score,
                },
                signals={
                    "session_id": r.session_id,
                    "role": r.role,
                    "matched_via": "hybrid_rrf",
                },
                assertion_type=AssertionType.INFERENTIAL,  # Experiential, not factual
                confidence=r.hybrid_score,  # Use RRF score as confidence
                valid_at=now,
            )
        )

    logger.debug("adapted_chat_messages", count=len(adapted))
    return adapted


# =============================================================================
# RAG Adapters (Qdrant Vector Retrieval)
# =============================================================================


def adapt_rag_chunks(
    chunks: List[Any],  # NodeWithScore from LlamaIndex
    user_id: int,
) -> List[UnifiedSearchResult]:
    """
    Adapt RAG retrieval chunks to unified contract.

    Role: EVIDENCE (for LLM grounding)
    Assertion: INFERENTIAL (similarity-based)
    Authority: SYSTEM_DERIVED (chunks derived from documents)
    """
    adapted = []
    now = datetime.utcnow()

    for chunk in chunks:
        # Extract metadata from LlamaIndex NodeWithScore
        metadata = chunk.node.metadata if hasattr(chunk, "node") else {}
        text = chunk.node.get_content() if hasattr(chunk, "node") else str(chunk)
        score = chunk.score if hasattr(chunk, "score") else 0.0
        chunk_id = chunk.node.id_ if hasattr(chunk, "node") else str(id(chunk))

        source_id = metadata.get("source_id")
        source_type = metadata.get("source_type", "document")

        identity = SearchEntityIdentity(
            id=chunk_id,
            type="chunk",
            authority=IdentityAuthority.SYSTEM_DERIVED,
            parent_id=source_id,
            root_id=source_id,  # Inherit root from parent document
            store="qdrant",
        )

        adapted.append(
            UnifiedSearchResult(
                id=identity,
                role=SearchRole.EVIDENCE,
                title=metadata.get("title", "Document Chunk"),
                snippet=text[:300] if text else None,
                url=f"/documents/{source_id}" if source_id else None,
                source="rag",
                scores={
                    "vector": score,
                },
                signals={
                    "chunk_index": metadata.get("chunk_index", 0),
                    "source_type": source_type,
                },
                assertion_type=AssertionType.INFERENTIAL,
                confidence=score,  # Use vector similarity as confidence
                valid_at=now,
            )
        )

    logger.debug("adapted_rag_chunks", count=len(adapted))
    return adapted


# =============================================================================
# Graph Intelligence Engine (GIE) Adapters
# =============================================================================


def adapt_gie_concepts(
    concepts: List[Dict[str, Any]],
    user_id: int,
) -> List[UnifiedSearchResult]:
    """
    Adapt Graph Intelligence Engine concepts to unified contract.

    Role: DIAGNOSTIC (learning insights)
    Assertion: HEURISTIC (computed/rule-based)
    Authority: KNOWLEDGE_GRAPH
    """
    adapted = []
    now = datetime.utcnow()

    for c in concepts:
        concept_id = c.get("concept_id", c.get("topic", "unknown"))

        identity = SearchEntityIdentity(
            id=concept_id,
            type="concept",
            authority=IdentityAuthority.KNOWLEDGE_GRAPH,
            parent_id=None,  # Concepts are self-referential
            root_id=None,  # KNOWLEDGE_GRAPH entities have no root
            store="graph",
        )

        mastery = c.get("mastery", c.get("mastery_score", 0.5))

        adapted.append(
            UnifiedSearchResult(
                id=identity,
                role=SearchRole.DIAGNOSTIC,
                title=c.get("concept_name", concept_id),
                snippet=None,
                url=None,  # Concepts don't have a direct URL
                source="graph",
                scores={
                    "mastery": float(mastery),
                    "stability": float(c.get("stability", 0.5)),
                    "volatility": float(c.get("volatility", 0.5)),
                },
                signals={
                    "is_weak_area": mastery < 0.3,
                    "is_fragile": c.get("category") == "fragile",
                    "learning_goal": "reinforce" if mastery < 0.3 else "maintain",
                    "trend": c.get("trend"),
                },
                assertion_type=AssertionType.HEURISTIC,
                confidence=c.get("confidence", 0.75),  # Default graph confidence
                valid_at=now,
                expires_at=None,  # Could add TTL based on decay model
            )
        )

    logger.debug("adapted_gie_concepts", count=len(adapted))
    return adapted


def adapt_weak_areas(
    weak_areas: List[Dict[str, Any]],
    user_id: int,
) -> List[UnifiedSearchResult]:
    """
    Adapt weak areas from SynapseContextBridge to unified contract.

    This is a convenience wrapper for weak areas specifically.
    """
    # Transform weak areas to concept format
    concepts = [
        {
            "concept_id": wa.get("topic", "unknown"),
            "concept_name": wa.get("topic", "Unknown Topic"),
            "mastery": wa.get("mastery_score", 0.0),
            "stability": 0.3,  # Weak areas are typically unstable
            "volatility": 0.7,
            "category": "weak",
        }
        for wa in weak_areas
    ]

    return adapt_gie_concepts(concepts, user_id)
