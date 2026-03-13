"""
Flashcard Repository

SQL query repository for flashcard operations. All SQL queries for flashcards
are centralized here, including calls to PostgreSQL functions for SM-2 algorithm,
context building, and analytics.

This follows the Repository Pattern - a layer between service and database.
"""

from typing import Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import json


class FlashcardRepository:
    """
    Repository for flashcard-related SQL operations.

    This class encapsulates all SQL queries and function calls for the flashcard module,
    including SM-2 spaced repetition calculations, due card retrieval, and performance analytics.
    """

    def __init__(self, session: AsyncSession):
        """
        Initialize repository with database session.

        Args:
            session: AsyncSession instance for database operations
        """
        self.session = session

    async def record_review(self, card_id: int, user_id: int, quality: int) -> Dict:
        """
        Record a flashcard review using the SM-2 algorithm.

        Calls the PostgreSQL function `record_review` which:
        1. Locks the card row for atomic update
        2. Validates user ownership
        3. Calculates new SM-2 values (ease_factor, repetitions, interval)
        4. Updates the card with new scheduling
        5. Creates a review history record

        Args:
            card_id: ID of the flashcard being reviewed
            user_id: ID of the user performing the review
            quality: Quality rating 0-5 (0=Again, 5=Trivial)

        Returns:
            Dict containing:
                - next_review_date: datetime of next review
                - new_interval: interval in days
                - new_ease_factor: updated ease factor
                - success: boolean indicating success

        Raises:
            Exception: If card not found or database error
        """
        query = text("""
            SELECT * FROM developer_schema.record_review(:card_id, :user_id, :quality)
        """)

        result = await self.session.execute(
            query, {"card_id": card_id, "user_id": user_id, "quality": quality}
        )

        row = result.fetchone()

        if not row:
            raise Exception(f"Failed to record review for card {card_id}")

        result_json = row[0] if isinstance(row[0], dict) else json.loads(row[0])

        return result_json

    async def get_due_cards(
        self, user_id: int, deck_id: Optional[int] = None, limit: int = 20
    ) -> List[Dict]:
        """
        Get cards due for review with priority scoring.

        Calls PostgreSQL function `get_due_cards` which:
        - Retrieves cards where next_review <= NOW()
        - Calculates priority score based on:
          * Overdue days (more overdue = higher priority)
          * Ease factor (lower = higher priority)
          * Learning state (new/learning prioritized)
        - Orders by priority score DESC

        Args:
            user_id: User ID to fetch cards for
            deck_id: Optional deck ID to filter by
            limit: Maximum number of cards to return

        Returns:
            List of dicts containing card data with priority scores
        """
        query = text("""
            SELECT * FROM developer_schema.get_due_cards(:user_id, :deck_id, :limit)
        """)

        params = {"user_id": user_id, "deck_id": deck_id, "limit": limit}

        result = await self.session.execute(query, params)

        rows = result.fetchall()

        cards = []
        for row in rows:
            cards.append(
                {
                    "id": row.card_id,
                    "deck_id": row.deck_id,
                    "deck_name": row.deck_name,
                    "front_text": row.front_text,
                    "back_text": row.back_text,
                    "ease_factor": float(row.ease_factor),
                    "interval": row.interval_days,
                    "repetitions": row.repetitions,
                    "last_review": row.last_review,
                    "next_review": row.next_review,
                    "learning_state": row.learning_state,
                    "times_reviewed": row.times_reviewed,
                    "accuracy": float(row.accuracy) if row.accuracy else 0.0,
                    "overdue_days": row.overdue_days,
                    "priority_score": float(row.priority_score) if row.priority_score else 0.0,
                }
            )

        return cards

    async def calculate_mastery(self, user_id: int, topic: str) -> float:
        """
        Calculate mastery score for a specific topic.

        Calls PostgreSQL function `calculate_mastery` which:
        - Aggregates review performance by topic
        - Applies formula: AVG(quality) * (1 + LOG(review_count))
        - Normalizes to 0.0-1.0 range

        Args:
            user_id: User ID
            topic: Topic/tag to calculate mastery for

        Returns:
            Mastery score between 0.0 and 1.0
        """
        query = text("""
            SELECT developer_schema.calculate_mastery(:user_id, :topic)
        """)

        result = await self.session.execute(query, {"user_id": user_id, "topic": topic})

        mastery_score = result.scalar()

        return float(mastery_score) if mastery_score else 0.0

    async def get_deck_statistics(self, deck_id: int) -> Dict:
        """
        Get comprehensive statistics for a deck.

        Uses PostgreSQL for aggregations:
        - Total cards, due cards, mastered cards
        - Average ease factor
        - Overall accuracy
        - Study streak

        Args:
            deck_id: Deck ID to get statistics for

        Returns:
            Dict containing deck statistics
        """
        query = text("""
            SELECT
                COUNT(*) as total_cards,
                COUNT(*) FILTER (WHERE next_review <= NOW()) as due_cards,
                COUNT(*) FILTER (WHERE learning_state = 'mastered') as mastered_cards,
                AVG(ease_factor) as avg_ease_factor,
                COUNT(DISTINCT user_id) as active_users
            FROM developer_schema.flashcards
            WHERE deck_id = :deck_id
              AND deleted_at IS NULL
        """)

        result = await self.session.execute(query, {"deck_id": deck_id})
        row = result.fetchone()

        if not row:
            return {
                "total_cards": 0,
                "due_cards": 0,
                "mastered_cards": 0,
                "avg_ease_factor": 0.0,
                "active_users": 0,
            }

        return {
            "total_cards": row.total_cards,
            "due_cards": row.due_cards,
            "mastered_cards": row.mastered_cards,
            "avg_ease_factor": float(row.avg_ease_factor) if row.avg_ease_factor else 0.0,
            "active_users": row.active_users,
        }

    async def get_weak_areas(self, user_id: int, limit: int = 5) -> List[Dict]:
        """
        Get user's weak areas (topics with low accuracy).

        Calls PostgreSQL function `detect_weak_areas` which:
        - Calculates average quality by topic
        - Filters topics with avg_quality < 0.7
        - Adds trend calculation using LAG() window function
        - Returns prioritized list

        Args:
            user_id: User ID
            limit: Maximum number of weak areas to return

        Returns:
            List of dicts with topic, accuracy, review_count, trend
        """
        query = text("""
            SELECT * FROM developer_schema.detect_weak_areas(:user_id, :limit)
        """)

        result = await self.session.execute(query, {"user_id": user_id, "limit": limit})

        rows = result.fetchall()

        weak_areas = []
        for row in rows:
            weak_areas.append(
                {
                    "topic": row.topic,
                    "accuracy": float(row.accuracy),
                    "review_count": row.review_count,
                    "trend": row.trend if hasattr(row, "trend") else "stable",
                }
            )

        return weak_areas

    async def get_review_history(self, card_id: int, limit: int = 50) -> List[Dict]:
        """
        Get review history for a card.

        Args:
            card_id: Card ID
            limit: Maximum number of reviews to return

        Returns:
            List of review records ordered by date DESC
        """
        query = text("""
            SELECT
                id,
                card_id,
                user_id,
                quality,
                ease_factor_before,
                ease_factor_after,
                interval_before,
                interval_after,
                time_taken_ms,
                reviewed_at
            FROM developer_schema.reviews
            WHERE card_id = :card_id
            ORDER BY reviewed_at DESC
            LIMIT :limit
        """)

        result = await self.session.execute(query, {"card_id": card_id, "limit": limit})

        rows = result.fetchall()

        history = []
        for row in rows:
            history.append(
                {
                    "id": row.id,
                    "card_id": row.card_id,
                    "user_id": row.user_id,
                    "quality": row.quality,
                    "ease_factor_before": float(row.ease_factor_before),
                    "ease_factor_after": float(row.ease_factor_after),
                    "interval_before": row.interval_before,
                    "interval_after": row.interval_after,
                    "time_taken_ms": row.time_taken_ms,
                    "reviewed_at": row.reviewed_at,
                }
            )

        return history
