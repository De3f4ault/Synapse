"""
GIE Safety Gate - The Ethical Firewall for Intelligence.

Decides whether a feedback signal is trustworthy enough to influence
long-term memory (Mastery, Knowledge Graph).

PRINCIPLE: Better to ignore a valid signal than to learn a false one.
"""

from app.schemas.search import FeedbackEvent, FeedbackSource


def should_update_mastery(event: FeedbackEvent) -> bool:
    """
    Deterministic gate for mastery updates.

    Rejects signals that are:
    - Ungrounded (hallucination risk)
    - Low confidence (noise risk)
    - System-generated only (echo chamber risk)
    - Ambiguous (ignored results)

    Args:
        event: The raw feedback event

    Returns:
        bool: True if safe to update mastery, False otherwise
    """

    # RULE 1: No grounding, no learning.
    # We cannot learn from hallucinations.
    if not event.is_grounded and event.intent == "retrieve_context":
        return False

    # RULE 2: Weak confidence is noise.
    # If the system wasn't sure, don't reinforce it.
    if event.avg_confidence and event.avg_confidence < 0.7:
        return False

    # RULE 3: Explicit rejection acts as a penalty signal,
    # but we handle penalties differently (decay, not boost).
    # For now, we only update mastery on POSITIVE signals.
    if event.event_type in ["answer_rejected", "result_ignored"]:
        return False

    # RULE 4: Human-in-the-loop validation
    # Explicit user feedback is the gold standard.
    if event.source == FeedbackSource.USER:
        return True

    # RULE 5: High-confidence Implicit signals
    # If system was very confident (>0.9) and user didn't reject,
    # we treat it as a weak positive signal.
    if event.source == FeedbackSource.SYSTEM:
        if event.event_type in ["result_clicked", "answer_accepted"]:
            return event.avg_confidence is not None and event.avg_confidence >= 0.9

    return False
