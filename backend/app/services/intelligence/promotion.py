"""
Signal Promotion Service - The Intelligence Gatekeeper.

Decides which raw feedback signals are worthy of influencing the system's
long-term intelligence (retrieval weights, mastery, graph connections).

PRINCIPLE: Learning happens at the edges. Only high-confidence signals pass.
"""

from typing import List, Optional
from datetime import datetime
import structlog

from app.schemas.search_feedback import FeedbackEvent
from app.schemas.search_identity import EntityIdentity, IdentityAuthority
from app.schemas.intelligence import QualifiedSignal

logger = structlog.get_logger(__name__)


class SignalPromotionService:
    """
    Promotes raw feedback into QualifiedSignals.
    """

    def promote_signal(self, event: FeedbackEvent) -> List[QualifiedSignal]:
        """
        Evaluate a feedback event and return a list of QualifiedSignals if eligible.

        Args:
            event: The raw feedback event

        Returns:
            List of QualifiedSignals (empty if demoted/ignored)
        """
        qualified_signals = []

        # ------------------------------------------------------------------
        # GATE 1: Grounding Check
        # We never learn from ungrounded interactions for evidence signals.
        # ------------------------------------------------------------------
        if not event.is_grounded and event.intent == "retrieve_context":
            logger.debug("signal_demoted_ungrounded", event_id=event.event_id)
            return []

        # ------------------------------------------------------------------
        # GATE 2: Confidence Threshold
        # Low confidence means the system was guessing. Don't reinforce guesses.
        # ------------------------------------------------------------------
        if event.avg_confidence and event.avg_confidence < 0.7:
            logger.debug("signal_demoted_low_confidence", event_id=event.event_id)
            return []

        # ------------------------------------------------------------------
        # LOGIC: Evidence Signals (Chat/RAG)
        # ------------------------------------------------------------------
        if event.intent == "retrieve_context":
            if event.event_type == "answer_accepted" or event.event_type == "result_clicked":
                # Promote USED evidence to "evidence_trusted"
                for evidence_id in event.used_evidence_ids:
                    qualified_signals.append(
                        QualifiedSignal(
                            entity_id=EntityIdentity(
                                id=evidence_id,
                                type="chunk",  # Assumption for RAG
                                authority=IdentityAuthority.SYSTEM_DERIVED,
                                store="qdrant",  # Assumption/Default
                                root_id=None,  # We might need to fetch this if not in event, but keep simple
                            ),
                            signal_type="evidence_trusted",
                            confidence_weight=0.9 if event.source == "user" else 0.5,
                            learning_value=1.0,
                            source=event.surface,
                            timestamp=datetime.now(),
                        )
                    )

            elif event.event_type == "answer_rejected":
                # Promote USED evidence to "evidence_rejected"
                for evidence_id in event.used_evidence_ids:
                    qualified_signals.append(
                        QualifiedSignal(
                            entity_id=EntityIdentity(
                                id=evidence_id,
                                type="chunk",
                                authority=IdentityAuthority.SYSTEM_DERIVED,
                                store="qdrant",
                                root_id=None,
                            ),
                            signal_type="evidence_rejected",
                            confidence_weight=1.0,  # Negative signals are high trust if explicit
                            learning_value=-1.0,
                            source=event.surface,
                            timestamp=datetime.now(),
                        )
                    )

        # ------------------------------------------------------------------
        # LOGIC: Mastery Signals (Concept)
        # TODO: Implement mapping from evidence to concept IDs for GIE updates
        # ------------------------------------------------------------------

        if qualified_signals:
            logger.info(
                "signals_promoted",
                count=len(qualified_signals),
                event_id=event.event_id,
                types=[s.signal_type for s in qualified_signals],
            )

        return qualified_signals
