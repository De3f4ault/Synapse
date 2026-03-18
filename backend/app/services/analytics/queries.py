"""
User analytics queries for SYNAPSE learning platform.

All queries run against PostgreSQL via SQLAlchemy async sessions.
Provides reusable query methods for user statistics, learning metrics,
engagement analysis, and performance tracking.
"""

import logging
from typing import Any, Dict, List
from datetime import datetime, timedelta

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class UserAnalyticsQueries:
    """
    Collection of analytical queries for user learning data.

    All queries run against PostgreSQL via SQLAlchemy async sessions.
    """

    def __init__(self, db_session: AsyncSession = None):
        """
        Initialize with database session.

        Args:
            db_session: SQLAlchemy async session for PostgreSQL
        """
        self.db_session = db_session
        logger.debug("Initialized UserAnalyticsQueries")

    async def get_user_learning_summary(self, user_id: int) -> Dict[str, Any]:
        """
        Get comprehensive user learning summary from PostgreSQL.

        Args:
            user_id: User ID

        Returns:
            Dictionary with learning summary data
        """
        if not self.db_session:
            return {}

        try:
            result = await self.db_session.execute(
                text("""
                    SELECT
                        (SELECT COUNT(*) FROM flashcards fc
                         JOIN decks d ON fc.deck_id = d.id
                         WHERE d.user_id = :uid) AS total_flashcards,
                        (SELECT COUNT(*) FROM decks WHERE user_id = :uid) AS total_decks,
                        (SELECT COUNT(*) FROM notes WHERE user_id = :uid) AS total_notes,
                        (SELECT COUNT(*) FROM documents WHERE user_id = :uid) AS total_documents,
                        (SELECT COUNT(*) FROM quizzes WHERE user_id = :uid) AS total_quizzes,
                        (SELECT COUNT(*) FROM reviews WHERE user_id = :uid) AS total_reviews,
                        (SELECT MAX(reviewed_at) FROM reviews WHERE user_id = :uid) AS last_activity
                """),
                {"uid": user_id},
            )
            row = result.first()
            if not row:
                return {}

            return {
                "user_id": user_id,
                "total_flashcards": row.total_flashcards or 0,
                "total_decks": row.total_decks or 0,
                "total_notes": row.total_notes or 0,
                "total_documents": row.total_documents or 0,
                "total_quizzes": row.total_quizzes or 0,
                "total_reviews": row.total_reviews or 0,
                "study_streak_days": 0,
                "overall_accuracy": 0.0,
                "total_study_time_minutes": 0,
                "last_activity": row.last_activity,
            }

        except Exception as e:
            logger.error(f"Error getting user learning summary: {e}")
            return {}

    async def get_performance_trends(
        self, user_id: int, days: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Get user's performance trends over time from PostgreSQL.

        Args:
            user_id: User ID
            days: Number of days to analyze

        Returns:
            List of daily performance metrics
        """
        if not self.db_session:
            return []

        try:
            result = await self.db_session.execute(
                text("""
                    SELECT
                        DATE(reviewed_at) AS review_date,
                        COUNT(*) AS daily_reviews,
                        AVG(CASE WHEN quality >= 3 THEN 1.0 ELSE 0.0 END) AS daily_accuracy,
                        AVG(ease_factor_after) AS avg_ease_factor
                    FROM reviews
                    WHERE user_id = :uid
                      AND reviewed_at >= CURRENT_DATE - :days * INTERVAL '1 day'
                    GROUP BY DATE(reviewed_at)
                    ORDER BY review_date
                """),
                {"uid": user_id, "days": days},
            )

            return [
                {
                    "date": str(row.review_date),
                    "review_count": int(row.daily_reviews),
                    "accuracy": float(row.daily_accuracy or 0) * 100,
                    "avg_ease_factor": float(row.avg_ease_factor or 0),
                }
                for row in result.all()
            ]

        except Exception as e:
            logger.error(f"Error getting performance trends: {e}")
            return []

    async def get_weak_areas(
        self, user_id: int, threshold: float = 70.0
    ) -> List[Dict[str, Any]]:
        """
        Identify user's weak learning areas from PostgreSQL.

        Args:
            user_id: User ID
            threshold: Accuracy threshold percentage (default 70%)

        Returns:
            List of weak areas with metrics
        """
        if not self.db_session:
            return []

        try:
            result = await self.db_session.execute(
                text("""
                    SELECT
                        fc.id AS card_id,
                        fc.front_text AS front_text,
                        COUNT(r.id) AS review_count,
                        AVG(CASE WHEN r.quality >= 3 THEN 1.0 ELSE 0.0 END) * 100 AS accuracy
                    FROM reviews r
                    JOIN flashcards fc ON r.card_id = fc.id
                    JOIN decks d ON fc.deck_id = d.id
                    WHERE d.user_id = :uid
                    GROUP BY fc.id, fc.front_text
                    HAVING AVG(CASE WHEN r.quality >= 3 THEN 1.0 ELSE 0.0 END) * 100 < :threshold
                    ORDER BY accuracy ASC
                    LIMIT 20
                """),
                {"uid": user_id, "threshold": threshold},
            )

            return [
                {
                    "card_id": int(row.card_id),
                    "topic": str(row.front_text)[:100],
                    "review_count": int(row.review_count),
                    "accuracy": float(row.accuracy),
                    "difficulty": "hard" if row.accuracy < 50 else "medium",
                }
                for row in result.all()
            ]

        except Exception as e:
            logger.error(f"Error getting weak areas: {e}")
            return []

    async def get_study_streaks(self, user_id: int) -> Dict[str, int]:
        """
        Calculate current and longest study streaks from PostgreSQL.

        Args:
            user_id: User ID

        Returns:
            Dictionary with current_streak and longest_streak
        """
        if not self.db_session:
            return {"current_streak": 0, "longest_streak": 0}

        try:
            result = await self.db_session.execute(
                text("""
                    SELECT DISTINCT DATE(reviewed_at) AS review_date
                    FROM reviews
                    WHERE user_id = :uid
                    ORDER BY review_date DESC
                    LIMIT 365
                """),
                {"uid": user_id},
            )
            review_dates = {row.review_date for row in result.all()}

            if not review_dates:
                return {"current_streak": 0, "longest_streak": 0}

            # Current streak
            today = datetime.utcnow().date()
            current_streak = 0
            for i in range(365):
                check_date = today - timedelta(days=i)
                if check_date in review_dates:
                    current_streak += 1
                else:
                    break

            # Longest streak
            sorted_dates = sorted(review_dates)
            longest_streak = 1
            current = 1
            for i in range(1, len(sorted_dates)):
                if (sorted_dates[i] - sorted_dates[i - 1]).days == 1:
                    current += 1
                    longest_streak = max(longest_streak, current)
                else:
                    current = 1

            return {
                "current_streak": current_streak,
                "longest_streak": longest_streak,
            }

        except Exception as e:
            logger.error(f"Error calculating study streaks: {e}")
            return {"current_streak": 0, "longest_streak": 0}

    async def get_learning_velocity(
        self, user_id: int, days: int = 7
    ) -> Dict[str, Any]:
        """
        Calculate user's learning velocity (cards reviewed per day).

        Args:
            user_id: User ID
            days: Period to analyze

        Returns:
            Dictionary with velocity metrics
        """
        velocity = {
            "period_days": days,
            "total_reviews": 0,
            "average_per_day": 0.0,
            "trend": "stable",
        }

        if not self.db_session:
            return velocity

        try:
            result = await self.db_session.execute(
                text("""
                    SELECT
                        COUNT(*) AS total,
                        COUNT(DISTINCT DATE(reviewed_at)) AS active_days
                    FROM reviews
                    WHERE user_id = :uid
                      AND reviewed_at >= CURRENT_DATE - :days * INTERVAL '1 day'
                """),
                {"uid": user_id, "days": days},
            )
            row = result.first()
            if row:
                velocity["total_reviews"] = int(row.total or 0)
                active_days = int(row.active_days or 0)
                if active_days > 0:
                    velocity["average_per_day"] = velocity["total_reviews"] / active_days

            # Compare with previous period for trend
            prev_result = await self.db_session.execute(
                text("""
                    SELECT COUNT(*) AS total
                    FROM reviews
                    WHERE user_id = :uid
                      AND reviewed_at >= CURRENT_DATE - :prev_days * INTERVAL '1 day'
                      AND reviewed_at < CURRENT_DATE - :days * INTERVAL '1 day'
                """),
                {"uid": user_id, "days": days, "prev_days": days * 2},
            )
            prev_row = prev_result.first()
            if prev_row and prev_row.total and prev_row.total > 0:
                prev_velocity = prev_row.total / max(1, days)
                current_velocity = velocity["total_reviews"] / max(1, days)
                if current_velocity > prev_velocity * 1.1:
                    velocity["trend"] = "improving"
                elif current_velocity < prev_velocity * 0.9:
                    velocity["trend"] = "declining"

        except Exception as e:
            logger.error(f"Error calculating learning velocity: {e}")

        return velocity

    async def get_mastery_scores(self, user_id: int) -> List[Dict[str, Any]]:
        """
        Calculate mastery scores for different decks from PostgreSQL.

        Args:
            user_id: User ID

        Returns:
            List of decks with mastery scores
        """
        if not self.db_session:
            return []

        try:
            result = await self.db_session.execute(
                text("""
                    SELECT
                        d.id AS deck_id,
                        d.name AS deck_name,
                        COUNT(DISTINCT fc.id) AS card_count,
                        COUNT(r.id) AS total_reviews,
                        AVG(CASE WHEN r.quality >= 3 THEN 1.0 ELSE 0.0 END) * 100 AS mastery
                    FROM decks d
                    LEFT JOIN flashcards fc ON d.id = fc.deck_id
                    LEFT JOIN reviews r ON fc.id = r.card_id
                    WHERE d.user_id = :uid
                    GROUP BY d.id, d.name
                    HAVING COUNT(r.id) > 0
                    ORDER BY mastery DESC
                """),
                {"uid": user_id},
            )

            return [
                {
                    "deck_id": int(row.deck_id),
                    "deck_name": str(row.deck_name),
                    "card_count": int(row.card_count),
                    "review_count": int(row.total_reviews),
                    "mastery_percentage": float(row.mastery or 0),
                }
                for row in result.all()
            ]

        except Exception as e:
            logger.error(f"Error getting mastery scores: {e}")
            return []

    async def execute_custom_query(self, query: str) -> list:
        """
        Execute custom SQL query against PostgreSQL.

        Args:
            query: SQL query string

        Returns:
            Query results as list of rows
        """
        if not self.db_session:
            logger.warning("No db_session available for custom query")
            return []

        try:
            result = await self.db_session.execute(text(query))
            return result.fetchall()
        except Exception as e:
            logger.error(f"Error executing custom query: {e}")
            return []
