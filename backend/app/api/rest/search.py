"""
Cross-module search REST API endpoints.

Unified search with:
- PostgreSQL pg_search BM25 (keyword matching via ParadeDB)
- Semantic search (Qdrant or pgvector)
- Hybrid ranking with RRF
- Unified Search Intelligence Bus
"""

from typing import List, Literal, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.utils.logging import get_logger
from app.schemas.search_context import SearchContext, SearchIntent
from app.schemas.search_response import UnifiedSearchResponse
from app.services.search.unified_service import get_unified_search_service
from app.schemas.search import (
    UnifiedSearchRequest,
    SearchClickRequest,
    SearchClickResponse,
)

logger = get_logger(__name__)

router = APIRouter()


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/suggest", response_model=List[str])
async def search_suggestions(
    query: str = Query(..., min_length=1, max_length=50, description="Partial query"),
    limit: int = Query(10, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
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
    cards_query = (
        select(Flashcard.front_text)
        .join(Deck)
        .where(
            and_(
                Deck.user_id == current_user.id,
                Flashcard.deleted_at.is_(None),
                Flashcard.front_text.ilike(search_pattern),
            )
        )
        .limit(limit)
    )

    cards_result = await db.execute(cards_query)
    for (text,) in cards_result:
        # Extract first few words
        words = text.split()[:3]
        if words:
            suggestions.add(" ".join(words))

    # Get note titles
    notes_query = (
        select(Note.title)
        .where(
            and_(
                Note.user_id == current_user.id,
                Note.deleted_at.is_(None),
                Note.title.ilike(search_pattern),
            )
        )
        .limit(limit)
    )

    notes_result = await db.execute(notes_query)
    for (title,) in notes_result:
        suggestions.add(title)

    # Convert to sorted list
    result = sorted(list(suggestions))[:limit]

    return result


# ============================================================================
# Multi-Entity Autocomplete (Paperless global search)
# ============================================================================


@router.get("/autocomplete")
async def search_autocomplete(
    query: str = Query(..., min_length=1, max_length=100, description="Search query"),
    limit: int = Query(10, ge=1, le=50, description="Max results per entity type"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Multi-entity autocomplete for the global search command palette.

    Returns matching documents, correspondents, tags, and document types
    in a single response — matching Paperless-ngx global search behavior.
    """
    from sqlalchemy import select, and_
    from app.models.document import Document
    from app.models.correspondent import Correspondent
    from app.models.document_type import DocumentType
    from app.models.tag import Tag
    from app.schemas.search import AutocompleteResult, AutocompleteResponse

    pattern = f"%{query}%"

    # Documents by filename
    docs_result = await db.execute(
        select(Document.id, Document.filename)
        .where(
            and_(
                Document.user_id == current_user.id,
                Document.deleted_at.is_(None),
                Document.filename.ilike(pattern),
            )
        )
        .limit(limit)
    )
    documents = [
        AutocompleteResult(id=row.id, name=row.filename, type="document")
        for row in docs_result.all()
    ]

    # Correspondents by name
    corr_result = await db.execute(
        select(Correspondent.id, Correspondent.name)
        .where(
            and_(
                Correspondent.user_id == current_user.id,
                Correspondent.name.ilike(pattern),
            )
        )
        .limit(limit)
    )
    correspondents = [
        AutocompleteResult(id=row.id, name=row.name, type="correspondent")
        for row in corr_result.all()
    ]

    # Tags by name
    tags_result = await db.execute(
        select(Tag.id, Tag.name)
        .where(
            and_(
                Tag.user_id == current_user.id,
                Tag.name.ilike(pattern),
            )
        )
        .limit(limit)
    )
    tags = [
        AutocompleteResult(id=row.id, name=row.name, type="tag")
        for row in tags_result.all()
    ]

    # Document types by name
    types_result = await db.execute(
        select(DocumentType.id, DocumentType.name)
        .where(
            and_(
                DocumentType.user_id == current_user.id,
                DocumentType.name.ilike(pattern),
            )
        )
        .limit(limit)
    )
    document_types = [
        AutocompleteResult(id=row.id, name=row.name, type="document_type")
        for row in types_result.all()
    ]

    return AutocompleteResponse(
        documents=documents,
        correspondents=correspondents,
        tags=tags,
        document_types=document_types,
    )


# ============================================================================
# Unified Search Intelligence Bus
# ============================================================================


@router.post(
    "/unified",
    response_model=UnifiedSearchResponse,
    summary="Unified Search",
    description="Execute search across all engines based on intent.",
)
async def unified_search(
    request: UnifiedSearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UnifiedSearchResponse:
    """Execute unified search across the Intelligence Bus."""
    context = SearchContext(
        user_id=current_user.id,
        intent=request.intent,
        surface=request.surface,
        max_latency_ms=request.max_latency_ms,
        max_results_per_engine=request.max_results_per_engine,
    )
    service = await get_unified_search_service(db)
    return await service.search(request.query, context)


@router.get(
    "/unified",
    response_model=UnifiedSearchResponse,
    summary="Unified Search (GET)",
    description="GET version of unified search for simple queries.",
)
async def unified_search_get(
    q: str = Query(..., description="Search query"),
    intent: SearchIntent = Query(SearchIntent.NAVIGATE, description="Search intent"),
    surface: Literal["cmdk", "chat", "dashboard", "study_hub"] = Query("cmdk"),
    limit: int = Query(20, ge=1, le=100, description="Max results per engine"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UnifiedSearchResponse:
    """GET endpoint for unified search."""
    context = SearchContext(
        user_id=current_user.id,
        intent=intent,
        surface=surface,
        max_latency_ms=200,
        max_results_per_engine=limit,
    )
    service = await get_unified_search_service(db)
    return await service.search(q, context)


# =============================================================================
# Click Tracking
# =============================================================================


@router.post("/click", response_model=SearchClickResponse)
async def record_search_click(
    body: SearchClickRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Record a click on a search result.

    Called by the frontend when a user clicks on a search result.
    Updates the search_queries analytics row with:
    - Which entity was clicked
    - What type of entity it was
    - What rank position it was at

    This data enables future MRR (Mean Reciprocal Rank) calculation
    and click-through rate analysis.
    """
    from app.services.search.analytics import log_search_click

    success = await log_search_click(
        db,
        query_id=body.query_id,
        clicked_entity_id=body.clicked_entity_id,
        clicked_entity_type=body.clicked_entity_type,
        clicked_rank=body.clicked_rank,
    )

    return SearchClickResponse(recorded=success)
