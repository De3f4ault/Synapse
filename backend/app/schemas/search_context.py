"""Search Context and Intent Contracts.

Defines what the consumer wants from search, including intent,
surface, and budget constraints.
"""

from pydantic import BaseModel
from typing import Literal, Optional
from enum import Enum


class SearchIntent(str, Enum):
    """
    What is the consumer trying to accomplish?

    This drives ENGINE PARTICIPATION, not ranking.
    Engines self-select based on intent.
    """

    NAVIGATE = "navigate"  # CMD+K, quick access to resources
    EXPLORE = "explore"  # Dashboard, discovery, browsing
    RETRIEVE_CONTEXT = "retrieve_context"  # Chat, RAG grounding for LLM
    DIAGNOSE = "diagnose"  # Weak areas, learning gaps, mastery


# Engine Participation Matrix
# Which engines participate for each intent?
ENGINE_PARTICIPATION = {
    SearchIntent.NAVIGATE: ["hybrid", "graph"],
    SearchIntent.EXPLORE: ["hybrid", "graph"],
    SearchIntent.RETRIEVE_CONTEXT: ["rag"],
    SearchIntent.DIAGNOSE: ["graph"],
}


class SearchContext(BaseModel):
    """
    Full context for a search request.

    GUARANTEES:
    - Intent is explicit (no guessing)
    - Surface is known (for analytics/feedback)
    - Budget constraints are enforceable
    """

    user_id: int
    intent: SearchIntent
    surface: Literal["cmdk", "chat", "dashboard", "study_hub"]
    session_id: Optional[str] = None  # For feedback correlation

    # Budget Constraints (soft enforcement)
    # Engines should self-limit, not get trimmed post-aggregation
    max_latency_ms: int = 200
    max_results_per_engine: int = 20

    class Config:
        use_enum_values = True


def get_participating_engines(intent: SearchIntent) -> list[str]:
    """Get the list of engines that should participate for a given intent."""
    return ENGINE_PARTICIPATION.get(intent, [])
