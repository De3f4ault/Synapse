"""Unified Search API Endpoint.

Exposes the Search Intelligence Bus via REST API.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Literal, Optional

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.search_context import SearchContext, SearchIntent
from app.schemas.search_response import UnifiedSearchResponse
from app.services.search.unified_service import get_unified_search_service


router = APIRouter()


# =============================================================================
# Request Models
# =============================================================================


class UnifiedSearchRequest(BaseModel):
    """Request body for unified search."""

    query: str
    intent: SearchIntent = SearchIntent.NAVIGATE
    surface: Literal["cmdk", "chat", "dashboard", "study_hub"] = "cmdk"
    max_latency_ms: int = 200
    max_results_per_engine: int = 20


# =============================================================================
# Endpoints
# =============================================================================


@router.post(
    "/unified",
    response_model=UnifiedSearchResponse,
    summary="Unified Search",
    description="""
    Execute search across all participating engines based on intent.
    
    Returns results per-engine in envelopes, preserving:
    - Raw scores (no normalization)
    - Role semantics (navigation, evidence, diagnostic)
    - Assertion types (factual, inferential, heuristic)
    - Temporal validity
    
    Consumers (UI) decide how to filter, rank, and display.
    """,
)
async def unified_search(
    request: UnifiedSearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UnifiedSearchResponse:
    """
    Execute unified search across the Intelligence Bus.

    Engine participation is determined by intent:
    - NAVIGATE: hybrid + graph
    - EXPLORE: hybrid + graph
    - RETRIEVE_CONTEXT: rag
    - DIAGNOSE: graph
    """
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
