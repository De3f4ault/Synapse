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
from app.services.search.fulltext import FullTextSearchService
from app.services.search.hybrid_v2 import HybridSearchServiceV2, SearchMode
from app.services.search.ranking import HybridRankingService
from app.utils.logging import get_logger
from app.schemas.search_context import SearchContext, SearchIntent
from app.schemas.search_response import UnifiedSearchResponse
from app.services.search.unified_service import get_unified_search_service
from app.schemas.search import (
    SearchResult,
    SearchResponse,
    HybridSearchResult,
    HybridSearchResponse,
    UnifiedSearchRequest,
    SearchClickRequest,
    SearchClickResponse,
)

logger = get_logger(__name__)

router = APIRouter()


# ============================================================================
# Endpoints
# ============================================================================


@router.get("", response_model=SearchResponse)
async def search_all(
    query: str = Query(..., min_length=1, description="Search query"),
    modules: Optional[str] = Query(
        "flashcards,notes,documents", description="Comma-separated modules to search"
    ),
    search_type: str = Query("hybrid", description="Search strategy: fts, semantic, or hybrid"),
    limit: int = Query(20, ge=1, le=100, description="Maximum results"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Advanced cross-module search (now using pg_search BM25).

    Search Types:
    - fts: PostgreSQL pg_search BM25 (keyword matching)
    - semantic: Vector similarity search (meaning matching)
    - hybrid: Combined BM25 + semantic (recommended)

    Modules:
    - flashcards: Search flashcard content
    - notes: Search note titles and content
    - documents: Search document filenames
    """
    logger.info(f"Search request: '{query}' (type={search_type}, user={current_user.id})")

    # Parse modules
    module_list = [m.strip() for m in modules.split(",")]

    all_results = []

    # === Full-Text Search (now using pg_search BM25) ===
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
        fts_results.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)

        logger.debug(f"BM25/FTS: {len(fts_results)} results")

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
                semantic_results.append(
                    {
                        "type": metadata.get("source_type", "document_chunk"),
                        "id": metadata.get("source_id", 0),
                        "title": metadata.get("title", "Untitled"),
                        "content": chunk.get("content", "")[:200],
                        "similarity_score": chunk.get("score", 0),
                        "metadata": metadata,
                    }
                )

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
                weights={"fts": 0.4, "semantic": 0.6},
            )

            # Deduplicate
            hybrid_results = HybridRankingService.deduplicate_results(hybrid_results)

            all_results = hybrid_results[:limit]

            logger.debug(f"Hybrid: {len(all_results)} final results")

        except Exception as e:
            logger.error(f"Hybrid ranking error: {e}")
            # Fall back to FTS results
            all_results = fts_results[:limit]

    # Format response
    formatted_results = []
    for result in all_results:
        formatted_results.append(
            SearchResult(
                type=result.get("type", "unknown"),
                id=result.get("id", 0),
                title=result.get("title") or result.get("front_text", "Untitled")[:100],
                content=result.get("content") or result.get("back_text", "")[:200],
                headline=result.get("headline"),
                relevance_score=result.get("relevance_score"),
                similarity_score=result.get("similarity_score"),
                hybrid_score=result.get("hybrid_score"),
                metadata=result.get("metadata", {}),
            )
        )

    logger.info(f"Search complete: {len(formatted_results)} results for '{query}'")

    return SearchResponse(
        query=query,
        search_type=search_type,
        total_results=len(formatted_results),
        results=formatted_results,
    )


@router.get("/hybrid", response_model=HybridSearchResponse)
async def search_hybrid(
    query: str = Query(..., min_length=1, description="Search query"),
    search_mode: str = Query("hybrid", description="Search mode: bm25, semantic, or hybrid"),
    bm25_weight: float = Query(1.0, ge=0.0, le=2.0, description="BM25 weight in RRF"),
    semantic_weight: float = Query(1.0, ge=0.0, le=2.0, description="Semantic weight in RRF"),
    limit: int = Query(20, ge=1, le=100, description="Maximum results"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Hybrid search using PostgreSQL-native pg_search BM25 + pgvector.

    This endpoint uses the new hybrid_search_notes SQL function with RRF.

    Search Modes:
    - bm25: BM25 full-text search only (pg_search)
    - semantic: Vector similarity search only (pgvector)
    - hybrid: Combined BM25 + semantic with RRF fusion

    Weight Parameters:
    - bm25_weight: How much to weight BM25 results (default 1.0)
    - semantic_weight: How much to weight semantic results (default 1.0)

    Higher weight = more influence on final ranking.
    """
    logger.info(
        f"Hybrid search: '{query}' mode={search_mode} "
        f"weights=({bm25_weight}, {semantic_weight}) user={current_user.id}"
    )

    # Map string mode to enum
    try:
        mode = SearchMode(search_mode.lower())
    except ValueError:
        mode = SearchMode.HYBRID

    # For semantic/hybrid, we need embeddings
    query_embedding = None
    if mode in (SearchMode.SEMANTIC, SearchMode.HYBRID):
        try:
            # Try to get embedding from existing embedder
            from app.core.ai.embeddings import get_embedder

            embedder = get_embedder()
            if hasattr(embedder, "embed"):
                query_embedding = embedder.embed(query)
            elif hasattr(embedder, "embed_query"):
                query_embedding = embedder.embed_query(query)
        except Exception as e:
            logger.warning(f"Could not generate embedding: {e}")
            if mode == SearchMode.SEMANTIC:
                # Can't do semantic without embedding
                return HybridSearchResponse(
                    query=query,
                    search_mode=mode.value,
                    bm25_weight=bm25_weight,
                    semantic_weight=semantic_weight,
                    total_results=0,
                    results=[],
                )
            # Fall back to BM25 for hybrid
            mode = SearchMode.BM25

    # Call the hybrid search service
    results = await HybridSearchServiceV2.hybrid_search_notes(
        user_id=current_user.id,
        query=query,
        db=db,
        query_embedding=query_embedding,
        limit=limit,
        search_mode=mode,
        bm25_weight=bm25_weight,
        semantic_weight=semantic_weight,
    )

    # Format results
    formatted = [
        HybridSearchResult(
            type=r.get("type", "note"),
            id=r.get("id", 0),
            title=r.get("title", ""),
            content=r.get("content"),
            headline=r.get("headline"),
            bm25_rank=r.get("bm25_rank"),
            semantic_rank=r.get("semantic_rank"),
            rrf_score=r.get("rrf_score", 0.0),
            search_mode=r.get("search_mode", mode.value),
        )
        for r in results
    ]

    logger.info(f"Hybrid search complete: {len(formatted)} results")

    return HybridSearchResponse(
        query=query,
        search_mode=mode.value,
        bm25_weight=bm25_weight,
        semantic_weight=semantic_weight,
        total_results=len(formatted),
        results=formatted,
    )


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
