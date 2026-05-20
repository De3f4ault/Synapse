"""
Search schemas.

Extracted from rest/search.py.
"""

from typing import List, Literal, Optional
from pydantic import BaseModel
from app.schemas.search.context import SearchIntent


class SearchResult(BaseModel):
    """Unified search result."""
    type: str
    id: int
    title: str
    content: Optional[str] = None
    headline: Optional[str] = None
    relevance_score: Optional[float] = None
    similarity_score: Optional[float] = None
    hybrid_score: Optional[float] = None
    metadata: Optional[dict] = None


class SearchResponse(BaseModel):
    """Search response."""
    query: str
    search_type: str
    total_results: int
    results: List[SearchResult]


class HybridSearchResult(BaseModel):
    """Hybrid search result with rank info."""
    type: str
    id: int
    title: str
    content: Optional[str] = None
    headline: Optional[str] = None
    bm25_rank: Optional[int] = None
    semantic_rank: Optional[int] = None
    rrf_score: float
    search_mode: str


class HybridSearchResponse(BaseModel):
    """Hybrid search response."""
    query: str
    search_mode: str
    bm25_weight: float
    semantic_weight: float
    total_results: int
    results: List[HybridSearchResult]


class UnifiedSearchRequest(BaseModel):
    """Request body for unified search."""
    query: str
    intent: SearchIntent = SearchIntent.NAVIGATE
    surface: Literal["cmdk", "chat", "dashboard", "study_hub"] = "cmdk"
    max_latency_ms: int = 200
    max_results_per_engine: int = 20


class SearchClickRequest(BaseModel):
    """Request body for recording a search result click."""
    query_id: int
    clicked_entity_id: int
    clicked_entity_type: str
    clicked_rank: int


class SearchClickResponse(BaseModel):
    """Response for click tracking."""
    recorded: bool


# ─── Multi-Entity Autocomplete ───────────────────────────────────────────────


class AutocompleteResult(BaseModel):
    """A single autocomplete result."""
    id: int
    name: str
    type: str  # "document" | "correspondent" | "tag" | "document_type"


class AutocompleteResponse(BaseModel):
    """Multi-entity autocomplete response."""
    documents: List[AutocompleteResult] = []
    correspondents: List[AutocompleteResult] = []
    tags: List[AutocompleteResult] = []
    document_types: List[AutocompleteResult] = []

