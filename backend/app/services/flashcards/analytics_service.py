"""
Deck analytics — per-deck mastery and retention data.

All data already exists across flashcards, activity_logs, and concept_mastery.
This service assembles it into a unified analytics payload.

Endpoint: GET /decks/{deck_id}/analytics
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

import structlog
from sqlalchemy import select, and_, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.flashcard import Flashcard, LearningState
from app.models.deck import Deck

logger = structlog.get_logger(__name__)


class DeckAnalyticsService:
    """Assembles per-deck analytics."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_deck_analytics(self, deck_id: int, user_id: int) -> Dict:
        """
        Return comprehensive analytics for a single deck.

        Shape:
            {
              deck_id, deck_name,
              mastery_distribution: {new, learning, review, mastered},
              mastery_pct: float,           # % cards in MASTERED state
              recall_rate: float,           # times_correct / times_reviewed overall
              avg_ease_factor: float,
              cards_due_today: int,
              cards_due_next_7_days: int,
              retention_curve: [{day_offset, expected_retention}],
              weak_cards: [{card_id, front_text, topic, times_incorrect, accuracy}],
              consistency_window: {days_active_last_30, total_reviews_last_30},
            }
        """
        deck, cards = await self._get_deck_and_cards(deck_id, user_id)

        if not cards:
            return self._empty_analytics(deck_id, deck.name)

        mastery_dist = self._mastery_distribution(cards)
        recall_rate = self._recall_rate(cards)
        avg_ease = sum(float(c.ease_factor) for c in cards) / len(cards)
        due_today = self._due_count(cards, days=0)
        due_next_7 = self._due_count(cards, days=7)
        retention_curve = self._retention_curve(cards)
        weak_cards = self._weak_cards(cards)
        consistency = await self._consistency_window(deck_id, user_id)
        projected_mastery = self._projected_mastery_date(cards)
        study_trend = await self._study_time_trend(deck_id)

        return {
            "deck_id": deck_id,
            "deck_name": deck.name,
            "total_cards": len(cards),
            "mastery_distribution": mastery_dist,
            "mastery_pct": round(
                mastery_dist["mastered"] / len(cards) * 100, 1
            ) if cards else 0.0,
            "recall_rate": round(recall_rate * 100, 1),
            "avg_ease_factor": round(avg_ease, 2),
            "cards_due_today": due_today,
            "cards_due_next_7_days": due_next_7,
            "retention_curve": retention_curve,
            "weak_cards": weak_cards,
            "consistency_window": consistency,
            "projected_mastery_date": projected_mastery,
            "study_time_trend": study_trend,
        }

    # ── Private helpers ───────────────────────────────────────────────────────

    async def _get_deck_and_cards(
        self, deck_id: int, user_id: int
    ):
        deck_result = await self.session.execute(
            select(Deck).where(
                and_(
                    Deck.id == deck_id,
                    Deck.user_id == user_id,
                    Deck.deleted_at.is_(None),
                )
            )
        )
        deck = deck_result.scalar_one_or_none()
        if not deck:
            raise ValueError(f"Deck {deck_id} not found or access denied")

        cards_result = await self.session.execute(
            select(Flashcard).where(
                and_(Flashcard.deck_id == deck_id, Flashcard.deleted_at.is_(None))
            )
        )
        cards = cards_result.scalars().all()
        return deck, cards

    @staticmethod
    def _mastery_distribution(cards) -> Dict[str, int]:
        dist = {s.value: 0 for s in LearningState}
        for c in cards:
            state_val = (
                c.learning_state.value
                if hasattr(c.learning_state, "value")
                else c.learning_state
            )
            if state_val in dist:
                dist[state_val] += 1
        return dist

    @staticmethod
    def _recall_rate(cards) -> float:
        total_reviewed = sum(c.times_reviewed for c in cards)
        total_correct = sum(c.times_correct for c in cards)
        if total_reviewed == 0:
            return 0.0
        return total_correct / total_reviewed

    @staticmethod
    def _due_count(cards, days: int) -> int:
        cutoff = datetime.now(timezone.utc) + timedelta(days=days)
        due = 0
        for c in cards:
            if c.next_review is None:
                # NEW cards — always "due"
                due += 1
            elif c.next_review.replace(tzinfo=None) <= cutoff.replace(tzinfo=None):
                due += 1
        return due

    @staticmethod
    def _retention_curve(cards) -> List[Dict]:
        """
        Simple Ebbinghaus-style estimated retention curve.

        For each day offset 0–30, estimate the fraction of cards
        the student is expected to still remember based on their intervals.
        Uses R(t) = e^(-t/S) where S is the SM-2 interval as a proxy for stability.
        """
        import math

        curve = []
        for day in [0, 1, 3, 7, 14, 30]:
            reviewed_cards = [c for c in cards if c.times_reviewed > 0]
            if not reviewed_cards:
                curve.append({"day_offset": day, "expected_retention": 1.0})
                continue

            retention_sum = sum(
                math.exp(-day / max(c.interval, 1)) for c in reviewed_cards
            )
            avg_retention = retention_sum / len(reviewed_cards)
            curve.append(
                {"day_offset": day, "expected_retention": round(avg_retention, 3)}
            )

        return curve

    @staticmethod
    def _weak_cards(cards, limit: int = 5) -> List[Dict]:
        """Cards with the lowest accuracy and at least 2 reviews."""
        reviewed = [c for c in cards if c.times_reviewed >= 2]
        reviewed.sort(
            key=lambda c: (c.times_correct / c.times_reviewed) if c.times_reviewed else 1.0
        )
        return [
            {
                "card_id": c.id,
                "front_text": c.front_text[:120],
                "topic": c.topic,
                "times_incorrect": c.times_incorrect,
                "accuracy": round(
                    c.times_correct / c.times_reviewed * 100, 1
                ) if c.times_reviewed else 0.0,
            }
            for c in reviewed[:limit]
        ]

    async def _consistency_window(self, deck_id: int, user_id: int) -> Dict:
        """
        Rolling 30-day consistency window.

        Queries review history from the `reviews` table to count
        days active and total reviews in the last 30 days.
        """
        try:
            result = await self.session.execute(
                text("""
                    SELECT
                        COUNT(DISTINCT DATE(r.reviewed_at))    AS days_active,
                        COUNT(*)                               AS total_reviews
                    FROM reviews r
                    JOIN flashcards f ON f.id = r.card_id
                    WHERE f.deck_id = :deck_id
                      AND f.deleted_at IS NULL
                      AND r.reviewed_at >= NOW() - INTERVAL '30 days'
                """),
                {"deck_id": deck_id},
            )
            row = result.fetchone()
            return {
                "days_active_last_30": int(row[0]) if row else 0,
                "total_reviews_last_30": int(row[1]) if row else 0,
            }
        except Exception as exc:
            logger.warning("consistency_window_query_failed", error=str(exc))
            return {"days_active_last_30": 0, "total_reviews_last_30": 0}

    @staticmethod
    def _projected_mastery_date(cards) -> Optional[str]:
        """
        Estimate when all cards will reach MASTERED state.

        Algorithm:
            - Cards already in MASTERED state: done.
            - Cards in REVIEW with interval>0: project forward by remaining
              review cycles needed to cross the mastery threshold (interval > 21 days).
            - NEW/LEARNING cards: assume 14-day ramp-up before entering REVIEW.
            - Take the maximum projected date across all non-mastered cards
              (the bottleneck determines when the deck is fully mastered).

        Returns ISO date string, or None if all cards are already mastered
        or no cards have been reviewed yet.
        """
        MASTERY_INTERVAL = 21  # days — matches LearningState.MASTERED convention
        NEW_RAMP_DAYS = 14     # estimated days for a new card to reach long intervals

        non_mastered = [
            c for c in cards
            if not (
                hasattr(c.learning_state, "value")
                and c.learning_state.value == "mastered"
            ) and (
                isinstance(c.learning_state, str) and c.learning_state != "mastered"
                or True
            )
        ]
        # Simpler: count by next_review projection
        today = datetime.now(timezone.utc)
        max_date = today

        for c in cards:
            state = (
                c.learning_state.value
                if hasattr(c.learning_state, "value")
                else c.learning_state
            )
            if state == "mastered":
                continue

            interval = getattr(c, "interval", 0) or 0
            ease = float(getattr(c, "ease_factor", 2.5))

            if state in ("new", "learning") or interval == 0:
                # Optimistic: assume SM-2 will reach 21-day interval in ~4 reviews
                projected = today + timedelta(days=NEW_RAMP_DAYS)
            else:
                # Estimate how many more doublings needed to cross MASTERY_INTERVAL
                doublings_needed = 0
                sim_interval = interval
                while sim_interval < MASTERY_INTERVAL:
                    sim_interval = int(sim_interval * ease)
                    doublings_needed += 1
                    if doublings_needed > 20:  # safety cap
                        break
                # Each doubling happens at the next_review date + accumulated interval
                next_rev = c.next_review.replace(tzinfo=timezone.utc) if c.next_review else today
                projected = next_rev + timedelta(days=sim_interval)

            if projected > max_date:
                max_date = projected

        if max_date == today:
            return None  # All mastered or no data
        return max_date.date().isoformat()

    async def _study_time_trend(self, deck_id: int) -> List[Dict]:
        """
        30-day daily review history for trend charts.

        Returns [{date, cards_reviewed, avg_quality}] ordered oldest-first.
        """
        try:
            result = await self.session.execute(
                text("""
                    SELECT
                        DATE(r.reviewed_at)             AS review_date,
                        COUNT(*)                        AS cards_reviewed,
                        ROUND(AVG(r.quality)::numeric, 2) AS avg_quality
                    FROM reviews r
                    JOIN flashcards f ON f.id = r.card_id
                    WHERE f.deck_id   = :deck_id
                      AND f.deleted_at IS NULL
                      AND r.reviewed_at >= NOW() - INTERVAL '30 days'
                    GROUP BY DATE(r.reviewed_at)
                    ORDER BY DATE(r.reviewed_at)
                """),
                {"deck_id": deck_id},
            )
            rows = result.fetchall()
            return [
                {
                    "date": str(row[0]),
                    "cards_reviewed": int(row[1]),
                    "avg_quality": float(row[2]) if row[2] is not None else 0.0,
                }
                for row in rows
            ]
        except Exception as exc:
            logger.warning("study_time_trend_query_failed", error=str(exc))
            return []

    @staticmethod
    def _empty_analytics(deck_id: int, deck_name: str) -> Dict:
        return {
            "deck_id": deck_id,
            "deck_name": deck_name,
            "total_cards": 0,
            "mastery_distribution": {"new": 0, "learning": 0, "review": 0, "mastered": 0},
            "mastery_pct": 0.0,
            "recall_rate": 0.0,
            "avg_ease_factor": 2.5,
            "cards_due_today": 0,
            "cards_due_next_7_days": 0,
            "retention_curve": [],
            "weak_cards": [],
            "consistency_window": {"days_active_last_30": 0, "total_reviews_last_30": 0},
            "projected_mastery_date": None,
            "study_time_trend": [],
        }
