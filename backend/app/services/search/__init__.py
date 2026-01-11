"""
Search services module.

Provides:
- FullTextSearchService: PostgreSQL FTS wrapper (now uses pg_search BM25)
- HybridSearchServiceV2: Hybrid BM25 + semantic search with RRF
- HybridRankingService: Result ranking and fusion utilities
- UnifiedRetrievalService: Routes queries to PostgreSQL or Qdrant
- HybridSearchService: New PostgreSQL-native hybrid search using SQL functions
- UnifiedSearchService: The Search Intelligence Bus (NEW)
"""

from .fulltext import FullTextSearchService
from .hybrid_v2 import HybridSearchServiceV2, SearchMode
from .ranking import HybridRankingService
from .unified_retrieval import UnifiedRetrievalService, ContentType, RetrievalResult
from .hybrid_search_service import (
    HybridSearchService,
    HybridSearchResult,
    FlashcardSearchResult,
    get_hybrid_search_service,
)

# NEW: Unified Search Intelligence Bus
from .unified_service import UnifiedSearchService, get_unified_search_service
from .contract import enforce_contract, ContractViolationError
from .adapters import (
    adapt_hybrid_note_results,
    adapt_hybrid_flashcard_results,
    adapt_rag_chunks,
    adapt_gie_concepts,
    adapt_weak_areas,
)

__all__ = [
    "FullTextSearchService",
    "HybridSearchServiceV2",
    "SearchMode",
    "HybridRankingService",
    "UnifiedRetrievalService",
    "ContentType",
    "RetrievalResult",
    # New SQL function-based hybrid search
    "HybridSearchService",
    "HybridSearchResult",
    "FlashcardSearchResult",
    "get_hybrid_search_service",
    # NEW: Unified Search Intelligence Bus
    "UnifiedSearchService",
    "get_unified_search_service",
    "enforce_contract",
    "ContractViolationError",
    "adapt_hybrid_note_results",
    "adapt_hybrid_flashcard_results",
    "adapt_rag_chunks",
    "adapt_gie_concepts",
    "adapt_weak_areas",
]
