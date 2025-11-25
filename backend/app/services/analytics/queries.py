"""
User analytics queries for SYNAPSE learning platform.

Provides reusable query templates for user statistics, learning metrics,
engagement analysis, and performance tracking.
"""

import logging
from typing import Any, Optional, Dict, List
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class UserAnalyticsQueries:
    """
    Collection of analytical queries for user learning data.

    Provides templates for querying user statistics, learning metrics,
    performance trends, and engagement data from PostgreSQL and DuckDB.
    """

    def __init__(self, db_session=None, duckdb_client=None):
        """
        Initialize with database clients.

        Args:
            db_session: SQLAlchemy session for PostgreSQL
            duckdb_client: DuckDB connection for analytics
        """
        self.db_session = db_session
        self.duckdb_client = duckdb_client
        logger.debug("Initialized UserAnalyticsQueries")

    async def get_user_learning_summary(self, user_id: int) -> Dict[str, Any]:
        """
        Get comprehensive user learning summary.

        Returns metrics across all learning modules.

        Args:
            user_id: User ID

        Returns:
            Dictionary with learning summary data
        """
        try:
            summary = {
                "user_id": user_id,
                "total_flashcards": 0,
                "total_decks": 0,
                "total_notes": 0,
                "total_documents": 0,
                "total_quizzes": 0,
                "total_reviews": 0,
                "study_streak_days": 0,
                "overall_accuracy": 0.0,
                "total_study_time_minutes": 0,
                "last_activity": None
            }

            if self.db_session:
                from sqlalchemy import select, func
                from app.models.flashcard import Flashcard
                from app.models.deck import Deck
                from app.models.note import Note
                from app.models.document import Document
                from app.models.quiz import Quiz
                from app.models.review import Review
                from app.models.study_session import StudySession

                # Flashcard count
                fc_result = await self.db_session.execute(
                    select(func.count(Flashcard.id)).select_from(Flashcard)
                    .join(Deck)
                    .where(Deck.user_id == user_id)
                )
                summary["total_flashcards"] = fc_result.scalar() or 0

                # Deck count
                dc_result = await self.db_session.execute(
                    select(func.count(Deck.id)).where(Deck.user_id == user_id)
                )
                summary["total_decks"] = dc_result.scalar() or 0

                # Note count
                nc_result = await self.db_session.execute(
                    select(func.count(Note.id)).where(Note.user_id == user_id)
                )
                summary["total_notes"] = nc_result.scalar() or 0

                # Document count
                doc_result = await self.db_session.execute(
                    select(func.count(Document.id)).where(Document.user_id == user_id)
                )
                summary["total_documents"] = doc_result.scalar() or 0

                # Quiz count
                qz_result = await self.db_session.execute(
                    select(func.count(Quiz.id)).where(Quiz.user_id == user_id)
                )
                summary["total_quizzes"] = qz_result.scalar() or 0

                # Review count
                rev_result = await self.db_session.execute(
                    select(func.count(Review.id)).where(Review.user_id == user_id)
                )
                summary["total_reviews"] = rev_result.scalar() or 0

                # Last activity
                last_review = await self.db_session.execute(
                    select(Review.created_at)
                    .where(Review.user_id == user_id)
                    .order_by(Review.created_at.desc())
                    .limit(1)
                )
                last_review_row = last_review.first()
                if last_review_row:
                    summary["last_activity"] = last_review_row[0]

            return summary

        except Exception as e:
            logger.error(f"Error getting user learning summary: {str(e)}")
            return {}

    async def get_performance_trends(
        self,
        user_id: int,
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Get user's performance trends over time.

        Returns daily accuracy and review counts.

        Args:
            user_id: User ID
            days: Number of days to analyze

        Returns:
            List of daily performance metrics
        """
        trends = []

        try:
            if not self.duckdb_client:
                return trends

            # Query DuckDB for daily performance
            query = f"""
            SELECT
                DATE(reviewed_at) as review_date,
                COUNT(*) as daily_reviews,
                AVG(CASE WHEN quality >= 3 THEN 1.0 ELSE 0.0 END) as daily_accuracy,
                AVG(ease_factor) as avg_ease_factor
            FROM flashcard_reviews
            WHERE user_id = {user_id}
                AND reviewed_at >= CURRENT_DATE - INTERVAL '{days} days'
            GROUP BY DATE(reviewed_at)
            ORDER BY review_date
            """

            result = await self.duckdb_client.execute(query)

            for row in result:
                trends.append({
                    "date": str(row[0]),
                    "review_count": int(row[1]),
                    "accuracy": float(row[2]) * 100 if row[2] else 0.0,
                    "avg_ease_factor": float(row[3]) if row[3] else 0.0
                })

            logger.debug(f"Retrieved {len(trends)} performance trend records for user {user_id}")

        except Exception as e:
            logger.error(f"Error getting performance trends: {str(e)}")

        return trends

    async def get_weak_areas(self, user_id: int, threshold: float = 70.0) -> List[Dict[str, Any]]:
        """
        Identify user's weak learning areas.

        Returns topics/tags where accuracy is below threshold.

        Args:
            user_id: User ID
            threshold: Accuracy threshold percentage (default 70%)

        Returns:
            List of weak areas with metrics
        """
        weak_areas = []

        try:
            if not self.duckdb_client:
                return weak_areas

            # Query DuckDB for accuracy by card/topic
            query = f"""
            SELECT
                fc.id as card_id,
                fc.front_text,
                COUNT(fr.id) as review_count,
                AVG(CASE WHEN fr.quality >= 3 THEN 1.0 ELSE 0.0 END) * 100 as accuracy
            FROM flashcard_reviews fr
            JOIN flashcards fc ON fr.card_id = fc.id
            WHERE fr.user_id = {user_id}
            GROUP BY fc.id, fc.front_text
            HAVING AVG(CASE WHEN fr.quality >= 3 THEN 1.0 ELSE 0.0 END) * 100 < {threshold}
            ORDER BY accuracy ASC
            LIMIT 20
            """

            result = await self.duckdb_client.execute(query)

            for row in result:
                weak_areas.append({
                    "card_id": int(row[0]),
                    "topic": str(row[1])[:100],  # Truncate for safety
                    "review_count": int(row[2]),
                    "accuracy": float(row[3]),
                    "difficulty": "hard" if row[3] < 50 else "medium"
                })

            logger.debug(f"Retrieved {len(weak_areas)} weak areas for user {user_id}")

        except Exception as e:
            logger.error(f"Error getting weak areas: {str(e)}")

        return weak_areas

    async def get_study_streaks(self, user_id: int) -> Dict[str, int]:
        """
        Calculate current and longest study streaks.

        Returns consecutive days with learning activity.

        Args:
            user_id: User ID

        Returns:
            Dictionary with current_streak and longest_streak
        """
        streaks = {"current_streak": 0, "longest_streak": 0}

        try:
            if not self.duckdb_client:
                return streaks

            # Get unique review dates in descending order
            query = f"""
            SELECT DISTINCT DATE(reviewed_at) as review_date
            FROM flashcard_reviews
            WHERE user_id = {user_id}
            ORDER BY review_date DESC
            LIMIT 365
            """

            result = await self.duckdb_client.execute(query)
            review_dates = [row[0] for row in result]

            if not review_dates:
                return streaks

            # Calculate current streak
            current_streak = 0
            today = datetime.utcnow().date()

            for i in range(365):
                check_date = today - timedelta(days=i)
                if check_date in review_dates:
                    current_streak += 1
                else:
                    break

            streaks["current_streak"] = current_streak

            # Calculate longest streak
            longest_streak = 0
            current = 0

            for date in sorted(review_dates):
                if current == 0:
                    current = 1
                elif (review_dates[review_dates.index(date) - 1] - timedelta(days=1)) == date:
                    current += 1
                else:
                    longest_streak = max(longest_streak, current)
                    current = 1

            longest_streak = max(longest_streak, current)
            streaks["longest_streak"] = longest_streak

            logger.debug(
                f"Calculated streaks for user {user_id}: "
                f"current={streaks['current_streak']}, "
                f"longest={streaks['longest_streak']}"
            )

        except Exception as e:
            logger.error(f"Error calculating study streaks: {str(e)}")

        return streaks

    async def get_learning_velocity(self, user_id: int, days: int = 7) -> Dict[str, Any]:
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
            "trend": "stable"  # stable, improving, declining
        }

        try:
            if not self.duckdb_client:
                return velocity

            # Get review count for period
            query = f"""
            SELECT
                COUNT(*) as total,
                COUNT(DISTINCT DATE(reviewed_at)) as active_days
            FROM flashcard_reviews
            WHERE user_id = {user_id}
                AND reviewed_at >= CURRENT_DATE - INTERVAL '{days} days'
            """

            result = await self.duckdb_client.execute(query)
            row = result.fetchone()

            if row:
                velocity["total_reviews"] = int(row[0])
                active_days = int(row[1])
                if active_days > 0:
                    velocity["average_per_day"] = velocity["total_reviews"] / active_days

            # Compare with previous period for trend
            prev_query = f"""
            SELECT COUNT(*)
            FROM flashcard_reviews
            WHERE user_id = {user_id}
                AND reviewed_at >= CURRENT_DATE - INTERVAL '{days * 2} days'
                AND reviewed_at < CURRENT_DATE - INTERVAL '{days} days'
            """

            prev_result = await self.duckdb_client.execute(prev_query)
            prev_row = prev_result.fetchone()

            if prev_row and prev_row[0] > 0:
                prev_velocity = prev_row[0] / days
                current_velocity = velocity["total_reviews"] / max(1, days)

                if current_velocity > prev_velocity * 1.1:
                    velocity["trend"] = "improving"
                elif current_velocity < prev_velocity * 0.9:
                    velocity["trend"] = "declining"

            logger.debug(f"Calculated velocity for user {user_id}: {velocity}")

        except Exception as e:
            logger.error(f"Error calculating learning velocity: {str(e)}")

        return velocity

    async def get_mastery_scores(self, user_id: int) -> List[Dict[str, Any]]:
        """
        Calculate mastery scores for different topics/decks.

        Returns accuracy and proficiency metrics grouped by topic.

        Args:
            user_id: User ID

        Returns:
            List of topics with mastery scores
        """
        mastery = []

        try:
            if not self.duckdb_client:
                return mastery

            # Query mastery by deck/topic
            query = f"""
            SELECT
                d.id as deck_id,
                d.name as deck_name,
                COUNT(DISTINCT fc.id) as card_count,
                COUNT(fr.id) as total_reviews,
                AVG(CASE WHEN fr.quality >= 3 THEN 1.0 ELSE 0.0 END) * 100 as mastery
            FROM decks d
            LEFT JOIN flashcards fc ON d.id = fc.deck_id
            LEFT JOIN flashcard_reviews fr ON fc.id = fr.card_id
            WHERE d.user_id = {user_id}
            GROUP BY d.id, d.name
            ORDER BY mastery DESC
            """

            result = await self.duckdb_client.execute(query)

            for row in result:
                if row[3] and row[3] > 0:  # Only include if there are reviews
                    mastery.append({
                        "deck_id": int(row[0]),
                        "deck_name": str(row[1]),
                        "card_count": int(row[2]),
                        "review_count": int(row[3]),
                        "mastery_percentage": float(row[4])
                    })

            logger.debug(f"Retrieved mastery scores for {len(mastery)} decks for user {user_id}")

        except Exception as e:
            logger.error(f"Error getting mastery scores: {str(e)}")

        return mastery

    async def execute_custom_query(
        self,
        query: str,
        query_type: str = "duckdb"
    ) -> List[Any]:
        """
        Execute custom SQL query (for advanced analytics).

        Args:
            query: SQL query string
            query_type: "duckdb" or "postgres"

        Returns:
            Query results
        """
        try:
            if query_type == "duckdb" and self.duckdb_client:
                result = await self.duckdb_client.execute(query)
                return result.fetchall()
            elif query_type == "postgres" and self.db_session:
                from sqlalchemy import text
                result = await self.db_session.execute(text(query))
                return result.fetchall()
            else:
                logger.warning(f"Query client not available: {query_type}")
                return []

        except Exception as e:
            logger.error(f"Error executing custom query: {str(e)}")
            return []
