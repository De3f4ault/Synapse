"""Search result data types.

Pure data containers for search results. Extracted from the former
hybrid_search_service.py to break the dependency on the V1 service
while preserving adapter compatibility.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class HybridSearchResult:
    """Result from hybrid note search (BM25 + vector with RRF)."""

    id: int
    title: Optional[str]
    content: str
    bm25_rank: int
    bm25_score: float
    vector_rank: int
    vector_score: float
    hybrid_score: float


@dataclass
class FlashcardSearchResult:
    """Result from hybrid flashcard search."""

    id: int
    front_text: str
    back_text: str
    deck_id: int
    bm25_rank: int
    bm25_score: float
    vector_rank: int
    vector_score: float
    hybrid_score: float


@dataclass
class ChatMessageSearchResult:
    """Result from chat message search.

    Note: When sourced from search_conversations_v3, bm25_rank/score
    and vector_rank/score are zeroed because V3 returns a composite
    relevance_score from its 6-stage ranking pipeline. The hybrid_score
    field carries that composite score.
    """

    id: int
    session_id: int
    content: str
    role: str
    session_title: Optional[str]
    bm25_rank: int
    bm25_score: float
    vector_rank: int
    vector_score: float
    hybrid_score: float
