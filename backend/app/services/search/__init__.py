"""
Search services module.

PUBLIC API:
- UnifiedSearchService: The canonical search entry point (Intelligence Bus)
- HybridSearchServiceV2: PostgreSQL-native BM25 + semantic with RRF
- Result types: HybridSearchResult, FlashcardSearchResult, ChatMessageSearchResult

INTERNAL (not exported):
- adapters, contract, fulltext, ranking
"""

# === PUBLIC: Canonical search entry point ===
from .unified_service import UnifiedSearchService, get_unified_search_service

# === PUBLIC: V2 hybrid search (static methods) ===
from .hybrid_v2 import HybridSearchServiceV2, SearchMode

# === PUBLIC: Result data types ===
from .result_types import HybridSearchResult, FlashcardSearchResult, ChatMessageSearchResult

# === PUBLIC: Contract enforcement ===
from .contract import enforce_contract, ContractViolationError

# === INTERNAL: Adapters (used by UnifiedSearchService engines) ===
from .adapters import (
    adapt_hybrid_note_results,
    adapt_hybrid_flashcard_results,
    adapt_chat_message_results,
    adapt_rag_chunks,
    adapt_gie_concepts,
    adapt_weak_areas,
)

__all__ = [
    # Canonical entry point
    "UnifiedSearchService",
    "get_unified_search_service",
    # V2 hybrid search
    "HybridSearchServiceV2",
    "SearchMode",
    # Result types
    "HybridSearchResult",
    "FlashcardSearchResult",
    "ChatMessageSearchResult",
    # Contract
    "enforce_contract",
    "ContractViolationError",
    # Adapters
    "adapt_hybrid_note_results",
    "adapt_hybrid_flashcard_results",
    "adapt_chat_message_results",
    "adapt_rag_chunks",
    "adapt_gie_concepts",
    "adapt_weak_areas",
]
