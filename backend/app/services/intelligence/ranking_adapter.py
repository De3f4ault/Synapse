"""
Ranking Adapter Service - Phase 3B.1 Adaptive Ranking.

This service applies ranking weights to search results based on
intelligence signals from the telemetry system.

DESIGN PRINCIPLES:
- Check feature flag on every operation
- Shadow mode logs without affecting results
- No stacking (refresh only)
- Surface-scoped weights
"""

from typing import List, Dict, Optional, Tuple
from datetime import datetime
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert
import structlog

from app.core.config import settings
from app.models.ranking_weight import RankingWeight
from app.schemas.intelligence import QualifiedSignal

logger = structlog.get_logger(__name__)


class RankingAdapter:
    """
    Applies adaptive ranking weights to search results.

    This is the ONLY place where weights influence retrieval.
    Weights are applied post-scoring, pre-rerank.
    """

    def __init__(self):
        self._cache: Dict[str, Tuple[float, datetime]] = {}
        self._cache_ttl_seconds = 60  # 1 minute cache

    def is_enabled(self) -> bool:
        """Check if adaptive ranking is enabled."""
        return settings.ENABLE_ADAPTIVE_RANKING

    def is_shadow_mode(self) -> bool:
        """Check if running in shadow mode (log only, no effect)."""
        return settings.ADAPTIVE_RANKING_SHADOW_MODE

    async def apply_weights(
        self,
        results: List[Dict],
        surface: str,
        entity_type: str,
        session: AsyncSession,
    ) -> List[Dict]:
        """
        Apply ranking weights to search results.

        Args:
            results: List of result dicts with 'id' and 'score' keys
            surface: The surface scope (chat, cmdk, dashboard)
            entity_type: Type of entity (chunk, note, concept)
            session: Database session

        Returns:
            Results with adjusted scores (or original if disabled/shadow)
        """
        if not self.is_enabled():
            return results

        if not results:
            return results

        # Get entity IDs
        entity_ids = [str(r.get("id", r.get("entity_id", ""))) for r in results]

        # Fetch applicable weights
        weights = await self._get_weights_for_entities(entity_ids, entity_type, surface, session)

        # Apply weights
        modified_count = 0
        for result in results:
            entity_id = str(result.get("id", result.get("entity_id", "")))
            weight = weights.get(entity_id)

            if weight and weight.effective_multiplier > 1.0:
                original_score = result.get("score", 1.0)
                effective_mult = weight.effective_multiplier
                adjusted_score = original_score * effective_mult

                if self.is_shadow_mode():
                    # Log but don't modify
                    logger.info(
                        "ranking_weight_shadow",
                        entity_id=entity_id,
                        surface=surface,
                        original_score=original_score,
                        would_be_score=adjusted_score,
                        multiplier=effective_mult,
                        remaining_ttl_ratio=weight.remaining_ttl_ratio,
                    )
                else:
                    # Actually apply the weight
                    result["score"] = adjusted_score
                    result["_weight_applied"] = effective_mult
                    modified_count += 1

                    logger.info(
                        "ranking_weight_applied",
                        entity_id=entity_id,
                        surface=surface,
                        original_score=original_score,
                        adjusted_score=adjusted_score,
                        multiplier=effective_mult,
                        remaining_ttl_ratio=weight.remaining_ttl_ratio,
                    )

        if modified_count > 0:
            logger.info(
                "ranking_weights_batch_applied",
                surface=surface,
                total_results=len(results),
                modified_count=modified_count,
            )

        return results

    async def _get_weights_for_entities(
        self,
        entity_ids: List[str],
        entity_type: str,
        surface: str,
        session: AsyncSession,
    ) -> Dict[str, RankingWeight]:
        """
        Fetch ranking weights for a batch of entities.

        Returns:
            Dict mapping entity_id to RankingWeight
        """
        if not entity_ids:
            return {}

        now = datetime.utcnow()

        stmt = select(RankingWeight).where(
            and_(
                RankingWeight.entity_id.in_(entity_ids),
                RankingWeight.entity_type == entity_type,
                RankingWeight.surface == surface,
                RankingWeight.expires_at > now,  # Only non-expired
            )
        )

        result = await session.execute(stmt)
        weights = result.scalars().all()

        return {w.entity_id: w for w in weights}

    async def promote_signal_to_weight(
        self,
        signal: QualifiedSignal,
        log_id: int,
        session: AsyncSession,
    ) -> Optional[RankingWeight]:
        """
        Promote a qualified signal to a ranking weight.

        Only 'evidence_trusted' signals create weights.
        Uses upsert (refresh) semantics - no stacking.

        Args:
            signal: The qualified signal from telemetry
            log_id: ID of the source telemetry log entry
            session: Database session

        Returns:
            The created/refreshed RankingWeight or None if not applicable
        """
        if not self.is_enabled():
            logger.debug("ranking_adapter_disabled", signal_type=signal.signal_type)
            return None

        # Only promote evidence_trusted signals
        if signal.signal_type != "evidence_trusted":
            logger.debug(
                "signal_not_promotable",
                signal_type=signal.signal_type,
                entity_id=str(signal.entity_id.id),
            )
            return None

        # Create weight using upsert (ON CONFLICT UPDATE expires_at)
        now = datetime.utcnow()
        ttl_days = settings.ADAPTIVE_RANKING_TTL_DAYS
        multiplier = settings.ADAPTIVE_RANKING_WEIGHT_MULTIPLIER

        from datetime import timedelta

        expires_at = now + timedelta(days=ttl_days)

        # Use PostgreSQL upsert
        stmt = insert(RankingWeight).values(
            entity_id=str(signal.entity_id.id),
            entity_type=signal.entity_id.type,
            surface=signal.source,
            weight_multiplier=multiplier,
            reason=signal.signal_type,
            created_at=now,
            expires_at=expires_at,
            source_log_id=log_id,
        )

        # On conflict: refresh expiration (no stacking)
        stmt = stmt.on_conflict_do_update(
            constraint="uq_ranking_weight_entity",
            set_={
                "expires_at": expires_at,
                "source_log_id": log_id,
            },
        )

        await session.execute(stmt)
        await session.commit()

        logger.info(
            "ranking_weight_created",
            entity_id=str(signal.entity_id.id),
            entity_type=signal.entity_id.type,
            surface=signal.source,
            multiplier=multiplier,
            ttl_days=ttl_days,
            source_log_id=log_id,
        )

        # Return the weight (fetch it back)
        stmt = select(RankingWeight).where(
            and_(
                RankingWeight.entity_id == str(signal.entity_id.id),
                RankingWeight.entity_type == signal.entity_id.type,
                RankingWeight.surface == signal.source,
                RankingWeight.reason == signal.signal_type,
            )
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def cleanup_expired(self, session: AsyncSession) -> int:
        """
        Remove expired weights from the database.

        Returns:
            Number of weights deleted
        """
        from sqlalchemy import delete

        now = datetime.utcnow()
        stmt = delete(RankingWeight).where(RankingWeight.expires_at < now)
        result = await session.execute(stmt)
        await session.commit()

        deleted = result.rowcount
        if deleted > 0:
            logger.info("expired_weights_cleaned", count=deleted)

        return deleted


# Singleton
_ranking_adapter: Optional[RankingAdapter] = None


def get_ranking_adapter() -> RankingAdapter:
    """Get or create the ranking adapter singleton."""
    global _ranking_adapter
    if _ranking_adapter is None:
        _ranking_adapter = RankingAdapter()
    return _ranking_adapter
