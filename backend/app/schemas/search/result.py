"""Unified Search Result Contract.

The canonical representation of any search hit in the Intelligence Bus.
Preserves full provenance, scores, signals, and temporal validity.
"""

from pydantic import BaseModel
from typing import Literal, Dict, Optional, Any
from datetime import datetime
from enum import Enum

from app.schemas.search.identity import SearchEntityIdentity


class SearchRole(str, Enum):
    """
    What phase of reasoning is this result valid for?

    This is NOT a UI hint - it's a semantic contract that determines
    how consumers should trust and use the result.
    """

    NAVIGATION = "navigation"  # Authoritative resources (notes, docs, decks)
    EVIDENCE = "evidence"  # RAG chunks for LLM grounding
    DIAGNOSTIC = "diagnostic"  # Weak areas, mastery gaps, learning signals
    SUGGESTION = "suggestion"  # AI-inferred, non-authoritative recommendations


class AssertionType(str, Enum):
    """
    How much should I trust this result?

    Enables trust-aware UX and prevents inference from overwriting facts.
    """

    FACTUAL = "factual"  # User-created, authoritative, ground truth
    INFERENTIAL = "inferential"  # Derived from embeddings/similarity
    HEURISTIC = "heuristic"  # Rule-based, approximate, computed


class UnifiedSearchResult(BaseModel):
    """
    Lossless representation of a search hit.

    GUARANTEES:
    - Raw scores are preserved (no premature normalization)
    - Provenance is explicit (source, store, authority)
    - Temporal validity is tracked (valid_at, expires_at, revision)
    - Signals explain WHY this result exists

    CONSUMERS decide meaning. This contract only transports truth.
    """

    id: SearchEntityIdentity
    role: SearchRole
    title: str
    snippet: Optional[str] = None
    url: Optional[str] = None

    # Provenance
    source: Literal["hybrid", "rag", "graph", "local"]

    # Raw Scores - NEVER normalize these at the bus level
    scores: Dict[str, float] = {}
    # Examples: {"bm25": 12.5, "vector": 0.82, "rrf": 0.18, "mastery": 0.35}

    # Intelligence Signals - WHY is this result here?
    signals: Dict[str, Any] = {}
    # Examples: {"matched_terms": ["react"], "is_weak_area": true, "trend": "declining"}

    # Trust Metadata
    assertion_type: AssertionType = AssertionType.FACTUAL
    confidence: Optional[float] = None  # 0.0 - 1.0, only for non-factual

    # Temporal Validity
    valid_at: datetime
    expires_at: Optional[datetime] = None
    revision: Optional[int] = None  # DB version / updated_at for cache invalidation

    # Extensibility
    metadata: Dict[str, Any] = {}

    class Config:
        use_enum_values = True
