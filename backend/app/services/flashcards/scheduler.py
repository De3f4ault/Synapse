"""
Scheduler dispatch interface — algorithm-agnostic scheduling.

This is the FSRS readiness layer. Today all decks use SM-2 (implemented as
a PostgreSQL function). When FSRS is activated for a deck, this dispatcher
routes to the FSRS implementation instead.

Usage:
    from app.services.flashcards.scheduler import get_scheduler
    scheduler = get_scheduler(deck.scheduling_algorithm)
    result = await scheduler.schedule(card_id, user_id, quality, session)

Adding FSRS later:
    1. Implement FSRSScheduler below
    2. Update _REGISTRY
    3. Flip decks.scheduling_algorithm = 'fsrs' per-user or per-deck
    No other code changes needed.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Dict, Literal

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = structlog.get_logger(__name__)

AlgorithmName = Literal["sm2", "fsrs"]


# ── Base interface ────────────────────────────────────────────────────────────


class BaseScheduler(ABC):
    """Abstract scheduler. Each algorithm implements this interface."""

    @abstractmethod
    async def schedule(
        self,
        card_id: int,
        user_id: int,
        quality: int,
        session: AsyncSession,
    ) -> Dict:
        """
        Apply the scheduling algorithm and persist the result.

        Args:
            card_id: Flashcard ID
            user_id: User performing the review (for ownership validation)
            quality: Rating 0-5
            session: Active async DB session

        Returns:
            Dict with at minimum:
                next_review_date, new_interval, new_ease_factor, success
        """
        ...

    @property
    @abstractmethod
    def name(self) -> AlgorithmName:
        """Algorithm identifier."""
        ...


# ── SM-2 implementation ───────────────────────────────────────────────────────


class SM2Scheduler(BaseScheduler):
    """
    SM-2 scheduler backed by the existing PostgreSQL `record_review` function.

    The SQL function handles:
        - Row-level locking for atomic updates
        - SM-2 ease_factor / interval / repetitions recalculation
        - Review history record creation
    """

    @property
    def name(self) -> AlgorithmName:
        return "sm2"

    async def schedule(
        self,
        card_id: int,
        user_id: int,
        quality: int,
        session: AsyncSession,
    ) -> Dict:
        result = await session.execute(
            text("SELECT record_review(:card_id, :user_id, :quality)"),
            {"card_id": card_id, "user_id": user_id, "quality": quality},
        )
        raw = result.scalar()

        if raw is None:
            raise ValueError(f"record_review returned NULL for card {card_id}")

        # The function returns JSONB — SQLAlchemy delivers it as a dict already
        data: Dict = raw if isinstance(raw, dict) else {}

        logger.info(
            "sm2_schedule_applied",
            card_id=card_id,
            quality=quality,
            next_review=data.get("next_review_date"),
            interval=data.get("new_interval"),
        )

        return data


# ── FSRS stub — ready to implement ───────────────────────────────────────────


class FSRSScheduler(BaseScheduler):
    """
    FSRS (Free Spaced Repetition Scheduler) — stub for future implementation.

    FSRS models memory as a continuous function of:
        - Stability (S): how long a memory lasts
        - Retrievability (R): probability of recalling at time t

    References:
        - https://github.com/open-spaced-repetition/fsrs4anki
        - Anki 23.10+ default algorithm

    Implementation steps when ready:
        1. Add fsrs_state JSONB column to flashcards (S, D, R params per card)
        2. Implement _compute_next_review() using FSRS equations
        3. Replace raise NotImplementedError below
    """

    @property
    def name(self) -> AlgorithmName:
        return "fsrs"

    async def schedule(
        self,
        card_id: int,
        user_id: int,
        quality: int,
        session: AsyncSession,
    ) -> Dict:
        # For now, fall back to SM-2 so FSRS decks don't break.
        # Replace this with real FSRS logic when implementing.
        logger.warning(
            "fsrs_not_implemented_falling_back_to_sm2",
            card_id=card_id,
        )
        return await SM2Scheduler().schedule(card_id, user_id, quality, session)


# ── Registry + factory ────────────────────────────────────────────────────────

_REGISTRY: Dict[AlgorithmName, BaseScheduler] = {
    "sm2": SM2Scheduler(),
    "fsrs": FSRSScheduler(),
}


def get_scheduler(algorithm: str = "sm2") -> BaseScheduler:
    """
    Return the scheduler for the given algorithm name.

    Falls back to SM-2 for unknown names so existing data never breaks.

    Args:
        algorithm: Value from decks.scheduling_algorithm

    Returns:
        Concrete BaseScheduler instance
    """
    scheduler = _REGISTRY.get(algorithm)
    if scheduler is None:
        logger.warning(
            "unknown_scheduling_algorithm_falling_back",
            algorithm=algorithm,
            fallback="sm2",
        )
        return _REGISTRY["sm2"]
    return scheduler
