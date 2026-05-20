"""
search/ — Search query, result, context, feedback, identity, and response schemas.

Internal dependency chain (must be respected):
    identity.py → result.py → response.py
    context.py  → response.py

    from app.schemas.search import UnifiedSearchResponse, SearchContext
"""

from app.schemas.search.queries import (
    SearchResult,
    SearchResponse,
    HybridSearchResult,
    HybridSearchResponse,
    UnifiedSearchRequest,
    SearchClickRequest,
    SearchClickResponse,
    AutocompleteResult,
    AutocompleteResponse,
)
from app.schemas.search.context import SearchIntent, SearchContext, get_participating_engines
from app.schemas.search.feedback import FeedbackSource, FeedbackEvent
from app.schemas.search.identity import IdentityAuthority, SearchEntityIdentity, get_authority
from app.schemas.search.result import SearchRole, AssertionType, UnifiedSearchResult
from app.schemas.search.response import EngineResult, UnifiedSearchResponse

__all__ = [
    # queries.py
    "SearchResult",
    "SearchResponse",
    "HybridSearchResult",
    "HybridSearchResponse",
    "UnifiedSearchRequest",
    "SearchClickRequest",
    "SearchClickResponse",
    "AutocompleteResult",
    "AutocompleteResponse",
    # context.py
    "SearchIntent",
    "SearchContext",
    "get_participating_engines",
    # feedback.py
    "FeedbackSource",
    "FeedbackEvent",
    # identity.py
    "IdentityAuthority",
    "SearchEntityIdentity",
    "get_authority",
    # result.py
    "SearchRole",
    "AssertionType",
    "UnifiedSearchResult",
    # response.py
    "EngineResult",
    "UnifiedSearchResponse",
]
