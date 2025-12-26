"""
Search services module.

Provides:
- FullTextSearchService: PostgreSQL FTS wrapper (now uses pg_search BM25)
- HybridSearchServiceV2: Hybrid BM25 + semantic search with RRF
- HybridRankingService: Result ranking and fusion utilities
- UnifiedRetrievalService: Routes queries to PostgreSQL or Qdrant
"""

from .fulltext import FullTextSearchService
from .hybrid_v2 import HybridSearchServiceV2, SearchMode
from .ranking import HybridRankingService
from .unified_retrieval import UnifiedRetrievalService, ContentType, RetrievalResult

__all__ = [
    "FullTextSearchService",
    "HybridSearchServiceV2",
    "SearchMode",
    "HybridRankingService",
    "UnifiedRetrievalService",
    "ContentType",
    "RetrievalResult",
]
