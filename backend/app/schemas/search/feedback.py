from pydantic import BaseModel
from typing import Literal, Optional, List
from enum import Enum
from datetime import datetime


class FeedbackSource(str, Enum):
    USER = "user"  # Explicit feedback (thumbs up/down)
    SYSTEM = "system"  # Implicit signals (dwell time, navigation)


class FeedbackEvent(BaseModel):
    """
    Provenance-aware record of a search/grounding interaction.
    Does NOT imply correctness, only utility.
    """

    event_id: str
    timestamp: datetime

    # Context
    user_id: int
    query: str
    intent: str
    surface: Literal["chat", "cmdk", "dashboard"]

    # Evidence Awareness (Grounding)
    available_evidence_ids: List[str]
    used_evidence_ids: List[str]

    # Outcome Signals
    is_grounded: bool
    avg_confidence: Optional[float] = None

    # Interaction Type
    event_type: Literal[
        "answer_accepted",  # User liked/copied response
        "answer_rejected",  # User disliked/regenerated
        "clarification_requested",  # Follow-up question indicating confusion
        "result_clicked",  # Navigation success
        "result_ignored",  # Navigation failure (maybe)
        "surfaced_but_skipped",  # Evidence retrieved but not used
    ]

    source: FeedbackSource
    dwell_time_ms: Optional[int] = None
