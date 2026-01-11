"""
Ranking Weight Model - Phase 3B.1 Adaptive Ranking.

Stores temporary, decaying ranking biases that influence retrieval
without modifying core entities.

DESIGN PRINCIPLES:
- Completely isolated from core data
- Self-expiring (TTL-based)
- Disposable (TRUNCATE for instant rollback)
- Surface-scoped (chat ≠ cmdk ≠ dashboard)
"""

from datetime import datetime, timedelta
from sqlalchemy import Column, BigInteger, String, Float, DateTime, Integer, ForeignKey
from app.db.base import Base


# Default TTL for ranking weights (10 days)
DEFAULT_WEIGHT_TTL_DAYS = 10

# Maximum allowed multiplier (safety bound)
MAX_WEIGHT_MULTIPLIER = 1.20

# Minimum multiplier that has any effect
MIN_EFFECTIVE_MULTIPLIER = 1.01


class RankingWeight(Base):
    """
    Temporary ranking weight for adaptive retrieval.

    This is NOT permanent learning. These weights:
    - Decay linearly over time
    - Expire completely after TTL
    - Never stack (same entity gets refreshed, not boosted further)
    - Are scoped to surface (chat/cmdk/dashboard)
    """

    __tablename__ = "ranking_weights"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    # Entity identification
    entity_id = Column(String, nullable=False, index=True)
    entity_type = Column(String(50), nullable=False)  # chunk | note | concept
    surface = Column(String(50), nullable=False)  # chat | cmdk | dashboard

    # Weight value (1.0 = neutral, >1.0 = boost)
    weight_multiplier = Column(Float, nullable=False, default=1.0)
    reason = Column(String(100), nullable=False)  # evidence_trusted, clicked, etc.

    # Lifecycle
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)

    # Audit trail
    source_log_id = Column(Integer, ForeignKey("intelligence_adaptation_log.id"), nullable=True)

    @property
    def is_expired(self) -> bool:
        """Check if this weight has expired."""
        return datetime.utcnow() > self.expires_at

    @property
    def elapsed_days(self) -> float:
        """Calculate days elapsed since weight creation."""
        elapsed = datetime.utcnow() - self.created_at
        return elapsed.total_seconds() / 86400  # seconds per day

    @property
    def effective_multiplier(self) -> float:
        """
        Calculate the effective multiplier with EXPONENTIAL decay.

        Formula: 1.0 + (weight_multiplier - 1.0) * (0.5 ** (elapsed_days / half_life_days))

        Half-life: 7 days (configurable)

        Example with 1.08 boost:
        - Day 0:  1.080
        - Day 7:  1.040
        - Day 14: 1.020
        - Day 21: 1.010
        - Day 28: 1.005

        At expiry: returns 1.0 (no effect)
        """
        if self.is_expired:
            return 1.0

        # Exponential decay with 7-day half-life
        half_life_days = 7.0
        decay_factor = 0.5 ** (self.elapsed_days / half_life_days)

        boost = self.weight_multiplier - 1.0
        decayed_boost = boost * decay_factor

        # Enforce cap at 1.15 (safety bound)
        return min(1.15, 1.0 + decayed_boost)

    @classmethod
    def create_for_signal(
        cls,
        entity_id: str,
        entity_type: str,
        surface: str,
        reason: str,
        multiplier: float = 1.05,
        ttl_days: int = DEFAULT_WEIGHT_TTL_DAYS,
        source_log_id: int = None,
    ) -> "RankingWeight":
        """
        Factory method to create a properly bounded weight.

        Args:
            entity_id: The entity to weight
            entity_type: Type of entity (chunk, note, concept)
            surface: Surface scope (chat, cmdk, dashboard)
            reason: Why this weight was created
            multiplier: The boost multiplier (capped at MAX_WEIGHT_MULTIPLIER)
            ttl_days: Days until expiration
            source_log_id: Optional link to telemetry log

        Returns:
            New RankingWeight instance
        """
        # Enforce bounds
        safe_multiplier = min(multiplier, MAX_WEIGHT_MULTIPLIER)
        safe_multiplier = max(safe_multiplier, 1.0)  # No negative boosts

        now = datetime.utcnow()

        return cls(
            entity_id=entity_id,
            entity_type=entity_type,
            surface=surface,
            weight_multiplier=safe_multiplier,
            reason=reason,
            created_at=now,
            expires_at=now + timedelta(days=ttl_days),
            source_log_id=source_log_id,
        )

    def refresh(self, ttl_days: int = DEFAULT_WEIGHT_TTL_DAYS) -> None:
        """
        Refresh the expiration without stacking the multiplier.

        This is intentional: repeated positive signals extend
        the weight's life, but don't amplify it.
        """
        self.expires_at = datetime.utcnow() + timedelta(days=ttl_days)

    def __repr__(self) -> str:
        return (
            f"<RankingWeight("
            f"entity={self.entity_type}:{self.entity_id}, "
            f"surface={self.surface}, "
            f"effective={self.effective_multiplier:.3f}, "
            f"expires={self.expires_at.isoformat()}"
            f")>"
        )
