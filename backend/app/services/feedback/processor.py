"""
Feedback Processor - The Orchestrator.

Connects the pipes between:
Raw Feedback -> Normalizer -> Safety Gate -> Promoter -> Intelligence Logs.

This is the synchronous entry point for feedback (for now).
In production, this would consume from a queue.
"""

from typing import List
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.search_feedback import FeedbackEvent
from app.schemas.intelligence import QualifiedSignal
from app.services.feedback.normalizer import normalize_feedback
from app.services.intelligence import get_promotion_service
from app.services.intelligence.telemetry import get_telemetry_service

logger = structlog.get_logger(__name__)


class FeedbackProcessor:
    """
    Process raw feedback events into application of intelligence updates.
    """

    def __init__(self):
        self.promotion_service = get_promotion_service()
        self.telemetry_service = get_telemetry_service()

    async def process_event(self, event: FeedbackEvent, db: AsyncSession) -> List[QualifiedSignal]:
        """
        Process a single feedback event.

        Flow:
        1. Normalize (Raw -> Intent)
        2. Gate (Safety Check)
        3. Promote (Qualified Signal)
        4. Log (Telemetry)

        Args:
            event: Raw feedback event
            db: Database session for telemetry persistence

        Returns:
            List of promoted Qualified Signals (or empty)
        """
        # 1. Normalize
        normalized = normalize_feedback(event)
        if not normalized:
            logger.debug("feedback_dropped_normalization", event_id=event.event_id)
            return []

        # 2. Safety Gate (for GIE influence)
        # Note: We might want to separate gates for RAG vs GIE.
        # For Phase 3A, we use the Promotion Service's internal logic
        # which effectively includes the safety checks.

        # 3. Promote
        # The Promotion Service acts as the Qualification Layer
        qualified_signals = self.promotion_service.promote_signal(event)

        if not qualified_signals:
            logger.debug("feedback_dropped_promotion", event_id=event.event_id)
            return []

        # 4. Telemetry / "Action" (Phase 3B/3C)
        # Record the signals to the robust log
        await self.telemetry_service.record_signals(qualified_signals, event.event_id, db)

        return qualified_signals


_processor = None


def get_feedback_processor() -> FeedbackProcessor:
    global _processor
    if _processor is None:
        _processor = FeedbackProcessor()
    return _processor
