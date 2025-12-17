"""
Cross-module search REST API endpoints - ENHANCED.

Unified search with:
- PostgreSQL Full-Text Search (FTS)
- Semantic search (Qdrant)
- Hybrid ranking
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.services.search.fulltext import FullTextSearchService
from app.services.search.ranking import HybridRankingService
from app.utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()


# ============================================================================
# Schemas
# ============================================================================

class SearchResult(BaseModel):
    """Unified search result."""
    type: str  # "flashcard", "note", "document"
    id: int
    title: str
    content: str
    headline: Optional[str] = None  # Highlighted snippet
    relevance_score: Optional[float] = None  # FTS score
    similarity_score: Optional[float] = None  # Semantic score
    hybrid_score: Optional[float] = None  # Combined score
    metadata: dict


class SearchResponse(BaseModel):
    """Search response."""
    query: str
    search_type: str
    total_results: int
    results: List[SearchResult]


# ============================================================================
# Endpoints
# ============================================================================

@router.get("", response_model=SearchResponse)
async def search_all(
    query: str = Query(..., min_length=1, description="Search query"),
    modules: Optional[str] = Query(
        "flashcards,notes,documents",
        description="Comma-separated modules to search"
    ),
    search_type: str = Query(
        "hybrid",
        description="Search strategy: fts, semantic, or hybrid"
    ),
    limit: int = Query(20, ge=1, le=100, description="Maximum results"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Advanced cross-module search.

    Search Types:
    - fts: PostgreSQL Full-Text Search (keyword matching)
    - semantic: Vector similarity search (meaning matching)
    - hybrid: Combined FTS + semantic (recommended)

    Modules:
    - flashcards: Search flashcard content
    - notes: Search note titles and content
    - documents: Search document filenames
    """
    logger.info(
        f"Search request: '{query}' (type={search_type}, user={current_user.id})"
    )

    # Parse modules
    module_list = [m.strip() for m in modules.split(",")]

    all_results = []

    # === Full-Text Search ===
    if search_type in ["fts", "hybrid"]:
        fts_results = []

        if "flashcards" in module_list:
            fts_flashcards = await FullTextSearchService.search_flashcards_fts(
                current_user.id, query, db, limit
            )
            fts_results.extend(fts_flashcards)

        if "notes" in module_list:
            fts_notes = await FullTextSearchService.search_notes_fts(
                current_user.id, query, db, limit
            )
            fts_results.extend(fts_notes)

        if "documents" in module_list:
            fts_docs = await FullTextSearchService.search_documents_fts(
                current_user.id, query, db, limit
            )
            fts_results.extend(fts_docs)

        # Sort by relevance
        fts_results.sort(
            key=lambda x: x.get("relevance_score", 0),
            reverse=True
        )

        logger.debug(f"FTS: {len(fts_results)} results")

        # If FTS-only, return results
        if search_type == "fts":
            all_results = fts_results[:limit]

    # === Semantic Search ===
    if search_type in ["semantic", "hybrid"]:
        from app.core.ai.rag.synapse_bridge import SynapseBridge

        try:
            bridge = SynapseBridge()
            semantic_data = await bridge.query_with_synapse_context(
                user_id=current_user.id,
                query=query,
                top_k=limit,
            )

            semantic_results = []
            for chunk in semantic_data.get("retrieved_chunks", []):
                metadata = chunk.get("metadata", {})
                semantic_results.append({
                    "type": metadata.get("source_type", "document_chunk"),
                    "id": metadata.get("source_id", 0),
                    "title": metadata.get("title", "Untitled"),
                    "content": chunk.get("content", "")[:200],
                    "similarity_score": chunk.get("score", 0),
                    "metadata": metadata,
                })

            logger.debug(f"Semantic: {len(semantic_results)} results")

            # If semantic-only, return results
            if search_type == "semantic":
                all_results = semantic_results[:limit]

        except Exception as e:
            logger.error(f"Semantic search error: {e}")
            # Fall back to FTS if available
            if search_type == "semantic":
                all_results = []

    # === Hybrid Ranking ===
    if search_type == "hybrid":
        try:
            # Combine FTS and semantic results
            hybrid_results = HybridRankingService.hybrid_rank(
                fts_results=fts_results,
                semantic_results=semantic_results,
                weights={"fts": 0.4, "semantic": 0.6}
            )

            # Deduplicate
            hybrid_results = HybridRankingService.deduplicate_results(
                hybrid_results
            )

            all_results = hybrid_results[:limit]

            logger.debug(f"Hybrid: {len(all_results)} final results")

        except Exception as e:
            logger.error(f"Hybrid ranking error: {e}")
            # Fall back to FTS results
            all_results = fts_results[:limit]

    # Format response
    formatted_results = []
    for result in all_results:
        formatted_results.append(SearchResult(
            type=result.get("type", "unknown"),
            id=result.get("id", 0),
            title=result.get("title") or result.get("front_text", "Untitled")[:100],
            content=result.get("content") or result.get("back_text", "")[:200],
            headline=result.get("headline"),
            relevance_score=result.get("relevance_score"),
            similarity_score=result.get("similarity_score"),
            hybrid_score=result.get("hybrid_score"),
            metadata=result.get("metadata", {}),
        ))

    logger.info(
        f"Search complete: {len(formatted_results)} results for '{query}'"
    )

    return SearchResponse(
        query=query,
        search_type=search_type,
        total_results=len(formatted_results),
        results=formatted_results,
    )


@router.get("/suggest", response_model=List[str])
async def search_suggestions(
    query: str = Query(..., min_length=1, max_length=50, description="Partial query"),
    limit: int = Query(10, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get search suggestions/autocomplete.

    Returns potential search terms based on user's content.
    """
    from sqlalchemy import select, and_
    from app.models.flashcard import Flashcard
    from app.models.deck import Deck
    from app.models.note import Note

    suggestions = set()
    search_pattern = f"{query}%"

    # Get flashcard terms
    cards_query = select(Flashcard.front_text).join(Deck).where(
        and_(
            Deck.user_id == current_user.id,
            Flashcard.deleted_at.is_(None),
            Flashcard.front_text.ilike(search_pattern)
        )
    ).limit(limit)

    cards_result = await db.execute(cards_query)
    for (text,) in cards_result:
        # Extract first few words
        words = text.split()[:3]
        if words:
            suggestions.add(" ".join(words))

    # Get note titles
    notes_query = select(Note.title).where(
        and_(
            Note.user_id == current_user.id,
            Note.deleted_at.is_(None),
            Note.title.ilike(search_pattern)
        )
    ).limit(limit)

    notes_result = await db.execute(notes_query)
    for (title,) in notes_result:
        suggestions.add(title)

    # Convert to sorted list
    result = sorted(list(suggestions))[:limit]

    return result
