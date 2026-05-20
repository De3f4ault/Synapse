"""
Signal Normalizer - Translation Layer.

Converts raw, context-dependent signals into normalized learning intents.
Handles the complexity of "what does a click mean?" across different surfaces.
"""

from typing import Optional
from app.schemas.search import FeedbackEvent, FeedbackSource


class NormalizedSignal:
    """Normalized meaning of a feedback event."""

    def __init__(
        self,
        event_id: str,
        learning_value: float,  # -1.0 to 1.0 (Positive/Negative)
        confidence_weight: float,  # 0.0 to 1.0 (How much we trust this signal)
        domain: str,  # "retrieval", "mastery", "content_quality"
    ):
        self.event_id = event_id
        self.learning_value = learning_value
        self.confidence_weight = confidence_weight
        self.domain = domain


def normalize_feedback(event: FeedbackEvent) -> Optional[NormalizedSignal]:
    """
    Converts raw feedback into a normalized learning signal.
    Returns None if the signal is too ambiguous to learn from.
    """

    # ---------------------------------------------------------
    # Intent: RETRIEVE_CONTEXT (Chat / RAG)
    # ---------------------------------------------------------
    if event.intent == "retrieve_context":
        if event.event_type == "answer_accepted":
            # Strong positive for retrieval & mastery
            return NormalizedSignal(event.event_id, 1.0, 1.0, "mastery")

        elif event.event_type == "clarification_requested":
            # Weak negative for retrieval (maybe context was missing)
            return NormalizedSignal(event.event_id, -0.5, 0.6, "retrieval")

        elif event.event_type == "surfaced_but_skipped":
            # Neutral/Ambiguous - likely irrelevant chunk
            return None

    # ---------------------------------------------------------
    # Intent: NAVIGATE (CMD+K)
    # ---------------------------------------------------------
    elif event.intent == "navigate":
        if event.event_type == "result_clicked":
            # Strong positive for retrieval relevance
            return NormalizedSignal(event.event_id, 1.0, 1.0, "retrieval")

        elif event.event_type == "result_ignored":
            # Weak negative (maybe user just didn't see what they wanted)
            return NormalizedSignal(event.event_id, -0.2, 0.3, "retrieval")

    # ---------------------------------------------------------
    # Intent: DIAGNOSE (Dashboard)
    # ---------------------------------------------------------
    elif event.intent == "diagnose":
        if event.event_type == "result_clicked":
            # User investigating a weak area -> Reinforce that this IS a weak area
            # (Wait, if they click a "Weak Area", do we increase or decrease mastery?
            # Answer: Neither. We increase the CONFIDENCE that it is weak.)
            return NormalizedSignal(event.event_id, 1.0, 0.8, "mastery_confidence")

    return None
