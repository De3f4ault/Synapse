"""
Evidence Overlay Service — Ledger-Aware Neighbor Enrichment

Phase Q2.4: Overlay recent learning evidence on semantic neighbors.

ARCHITECTURAL INVARIANT:
- Advisory only, NEVER mutates state
- Think DIAGNOSTICS, not DIAGNOSIS
- Surfaces *signals*, not decisions
- Used for: explaining why something surfaced, UI display
- Never for: interval modification, ease adjustment, mastery claims

Usage:
    enriched = await EvidenceOverlayService.enrich_with_evidence(
        db, user_id, neighbors, lookback_days=7
    )
"""

from typing import List, Optional, Literal
from dataclasses import dataclass
from datetime import datetime, timedelta
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from .semantic_neighbor_service import SemanticNeighbor

logger = structlog.get_logger(__name__)


# =============================================================================
# Evidence Strength Classification
# =============================================================================


EvidenceStrength = Literal[
    "weak_recent",  # Low quality, reviewed recently (needs attention)
    "weak_old",  # Low quality, not reviewed recently (forgotten)
    "strong_recent",  # High quality, reviewed recently (fresh mastery)
    "strong_old",  # High quality, not reviewed in a while (stable)
    "no_data",  # Never reviewed or no data available
]


def classify_evidence(
    quality_score: Optional[int],
    days_ago: Optional[int],
    weak_threshold: int = 3,
    recent_threshold_days: int = 7,
) -> EvidenceStrength:
    """
    Classify evidence strength for UI display.

    Args:
        quality_score: SM-2 quality score (0-5)
        days_ago: Days since last review
        weak_threshold: Quality below this is "weak"
        recent_threshold_days: Reviews within this window are "recent"

    Returns:
        EvidenceStrength classification
    """
    if quality_score is None or days_ago is None:
        return "no_data"

    is_weak = quality_score < weak_threshold
    is_recent = days_ago < recent_threshold_days

    if is_weak and is_recent:
        return "weak_recent"
    elif is_weak:
        return "weak_old"
    elif is_recent:
        return "strong_recent"
    else:
        return "strong_old"


# =============================================================================
# Data Types
# =============================================================================


@dataclass
class EnrichedNeighbor:
    """
    A semantic neighbor enriched with learning evidence from the ledger.

    INVARIANT: This is advisory data only, never used for scheduling.
    """

    # Original neighbor data
    id: int
    entity_type: str
    content_preview: str
    similarity: float

    # Evidence overlay from ActivityLog
    last_quality: Optional[int] = None  # Most recent quality score (0-5)
    last_attempt_at: Optional[datetime] = None
    attempt_count: int = 0
    evidence_strength: EvidenceStrength = "no_data"

    # Advisory context
    days_since_review: Optional[int] = None

    @classmethod
    def from_neighbor(
        cls,
        neighbor: SemanticNeighbor,
        last_quality: Optional[int] = None,
        last_attempt_at: Optional[datetime] = None,
        attempt_count: int = 0,
    ) -> "EnrichedNeighbor":
        """Create from a SemanticNeighbor with ledger data."""
        days_ago = None
        if last_attempt_at:
            days_ago = (datetime.utcnow() - last_attempt_at).days

        return cls(
            id=neighbor.id,
            entity_type=neighbor.entity_type,
            content_preview=neighbor.content_preview,
            similarity=neighbor.similarity,
            last_quality=last_quality,
            last_attempt_at=last_attempt_at,
            attempt_count=attempt_count,
            evidence_strength=classify_evidence(last_quality, days_ago),
            days_since_review=days_ago,
        )


# =============================================================================
# Evidence Overlay Service
# =============================================================================


class EvidenceOverlayService:
    """
    Overlay recent learning evidence on semantic neighbors.

    INVARIANT: Advisory only, never mutates state.
    Think DIAGNOSTICS, not DIAGNOSIS.
    """

    # Map entity types to ActivityLog activity_type values
    # NOTE: Values must match ActivityType enum values (lowercase)
    ACTIVITY_TYPE_MAP = {
        "flashcard": "flashcard_review",
        "question": "quiz_question_attempt",
        "note": None,  # Notes don't have learning events
    }

    @classmethod
    async def enrich_with_evidence(
        cls,
        db: AsyncSession,
        user_id: int,
        neighbors: List[SemanticNeighbor],
        lookback_days: int = 14,
    ) -> List[EnrichedNeighbor]:
        """
        Add ledger evidence to each neighbor.

        Queries ActivityLog for:
        - last_quality: Most recent quality score
        - last_attempt_at: When last reviewed
        - attempt_count: How many times attempted in lookback window
        - evidence_strength: Classification (weak_recent, strong_old, etc)

        Args:
            db: Database session
            user_id: User ID
            neighbors: List of semantic neighbors to enrich
            lookback_days: Days to look back for evidence

        Returns:
            List of EnrichedNeighbor with ledger evidence overlaid
        """
        if not neighbors:
            return []

        enriched: List[EnrichedNeighbor] = []
        lookback_date = datetime.utcnow() - timedelta(days=lookback_days)

        for neighbor in neighbors:
            activity_type = cls.ACTIVITY_TYPE_MAP.get(neighbor.entity_type)

            if not activity_type:
                # No learning events for this entity type (e.g., notes)
                enriched.append(EnrichedNeighbor.from_neighbor(neighbor))
                continue

            try:
                # Query most recent learning event for this entity
                result = await db.execute(
                    text("""
                    SELECT 
                        quality_score,
                        created_at,
                        COUNT(*) OVER () as total_attempts
                    FROM activity_logs
                    WHERE user_id = :user_id
                      AND resource_id = :entity_id
                      AND activity_type = :activity_type
                      AND created_at > :lookback_date
                      AND is_learning_event = true
                    ORDER BY created_at DESC
                    LIMIT 1
                """),
                    {
                        "user_id": user_id,
                        "entity_id": neighbor.id,
                        "activity_type": activity_type,
                        "lookback_date": lookback_date,
                    },
                )

                row = result.first()

                if row:
                    enriched.append(
                        EnrichedNeighbor.from_neighbor(
                            neighbor,
                            last_quality=row.quality_score,
                            last_attempt_at=row.created_at,
                            attempt_count=row.total_attempts or 0,
                        )
                    )
                else:
                    enriched.append(EnrichedNeighbor.from_neighbor(neighbor))

            except Exception as e:
                logger.warning(
                    "evidence_query_failed",
                    entity_id=neighbor.id,
                    entity_type=neighbor.entity_type,
                    error=str(e),
                )
                enriched.append(EnrichedNeighbor.from_neighbor(neighbor))

        return enriched

    @classmethod
    async def get_weak_area_neighbors(
        cls,
        db: AsyncSession,
        user_id: int,
        neighbors: List[SemanticNeighbor],
        lookback_days: int = 7,
    ) -> List[EnrichedNeighbor]:
        """
        Filter to only neighbors in weak areas (weak_recent or weak_old).

        Useful for surfacing items that need attention.

        Args:
            db: Database session
            user_id: User ID
            neighbors: Semantic neighbors to filter
            lookback_days: Days to look back

        Returns:
            Filtered list of EnrichedNeighbor with weak evidence
        """
        enriched = await cls.enrich_with_evidence(db, user_id, neighbors, lookback_days)
        return [e for e in enriched if e.evidence_strength in ("weak_recent", "weak_old")]
