"""
Telemetry Service - Intelligence Persistence.

Persists qualified signals to the database for:
1. Audit trails
2. Offline analysis (Phase 3B)
3. Rollback capabilities (Phase 3C)

Phase 3B.1: Also promotes signals to ranking weights.
"""

from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.intelligence import IntelligenceAdaptationLog
from app.schemas.intelligence import QualifiedSignal
from app.services.intelligence.ranking_adapter import get_ranking_adapter
import structlog

logger = structlog.get_logger(__name__)


class TelemetryService:
    """
    Service for recording intelligence adaptation events.

    Phase 3B.1: Also promotes 'evidence_trusted' signals to ranking weights.
    """

    async def record_signals(
        self, signals: List[QualifiedSignal], source_event_id: str, session: AsyncSession
    ):
        """
        Persist a batch of qualified signals and promote to ranking weights.

        Phase 3B.1: After logging, eligible signals are promoted to ranking weights
        via the RankingAdapter (respects feature flags).
        """
        if not signals:
            return

        logs = []
        for signal in signals:
            log_entry = IntelligenceAdaptationLog(
                timestamp=signal.timestamp,
                source_event_id=source_event_id,
                surface=signal.source,
                entity_id=str(signal.entity_id.id),
                entity_type=signal.entity_id.type,
                signal_type=signal.signal_type,
                learning_value=signal.learning_value,
                confidence_weight=signal.confidence_weight,
                applied_actions=None,  # Updated below if weight is created
            )
            logs.append((log_entry, signal))

        # Persist telemetry logs first
        session.add_all([log for log, _ in logs])
        await session.flush()  # Get IDs without committing

        logger.info("telemetry_recorded", count=len(logs), source_event_id=source_event_id)

        # Phase 3B.1: Promote signals to ranking weights
        ranking_adapter = get_ranking_adapter()
        promoted_count = 0

        for log_entry, signal in logs:
            weight = await ranking_adapter.promote_signal_to_weight(
                signal=signal,
                log_id=log_entry.id,
                session=session,
            )

            if weight:
                # Update log entry with applied action
                log_entry.applied_actions = {
                    "type": "ranking_weight",
                    "weight_multiplier": weight.weight_multiplier,
                    "expires_at": weight.expires_at.isoformat(),
                }
                promoted_count += 1

        await session.commit()

        if promoted_count > 0:
            logger.info(
                "signals_promoted_to_weights",
                promoted_count=promoted_count,
                total_signals=len(logs),
            )


_telemetry_service = None


def get_telemetry_service() -> TelemetryService:
    global _telemetry_service
    if _telemetry_service is None:
        _telemetry_service = TelemetryService()
    return _telemetry_service
