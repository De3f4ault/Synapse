"""
Analytics Update Subscriber

Updates analytics databases (DuckDB) when events occur.
Complete implementation with all DuckDB table inserts.
"""

from typing import List
from datetime import datetime
import logging

from .base import BaseSubscriber
from ..triggers import Event, EventType

logger = logging.getLogger(__name__)


class AnalyticsUpdateSubscriber(BaseSubscriber):
    """
    Subscriber that updates analytics when learning events occur.

    This keeps DuckDB analytics tables fresh with real-time learning data.
    Handles:
    - Flashcard review analytics
    - Study session analytics
    - Quiz completion analytics
    - Content creation analytics
    - Materialized view refreshes
    """

    def __init__(self, duckdb_client=None, db_session=None):
        """
        Initialize analytics update subscriber

        Args:
            duckdb_client: DuckDB connection for analytics
            db_session: SQLAlchemy session for PostgreSQL access
        """
        super().__init__()
        self.duckdb_client = duckdb_client
        self.db_session = db_session

    def get_subscribed_events(self) -> List[EventType]:
        """Events that trigger analytics updates"""
        return [
            # Review events
            EventType.CARD_REVIEWED,
            EventType.STUDY_ITEM_REVIEWED,

            # Session events
            EventType.STUDY_SESSION_COMPLETED,
            EventType.QUIZ_COMPLETED,

            # Content creation events
            EventType.CARD_CREATED,
            EventType.NOTE_CREATED,
            EventType.DOCUMENT_PROCESSED,
        ]

    async def on_event(self, event: Event):
        """
        Update analytics based on event

        Args:
            event: Event triggering analytics update
        """
        if not self.duckdb_client:
            logger.debug("no_duckdb_client_skipping_analytics_update")
            return

        try:
            # Route to appropriate handler
            if event.type == EventType.CARD_REVIEWED:
                await self._update_review_analytics(event)

            elif event.type == EventType.STUDY_SESSION_COMPLETED:
                await self._update_session_analytics(event)

            elif event.type == EventType.QUIZ_COMPLETED:
                await self._update_quiz_analytics(event)

            elif event.type in [
                EventType.CARD_CREATED,
                EventType.NOTE_CREATED,
                EventType.DOCUMENT_PROCESSED
            ]:
                await self._update_content_analytics(event)

            logger.info(
                "analytics_updated",
                event_type=event.type.value,
                user_id=event.user_id
            )

        except Exception as e:
            logger.error(
                "analytics_update_failed",
                event_type=event.type.value,
                user_id=event.user_id,
                error=str(e),
                exc_info=True
            )

    async def _update_review_analytics(self, event: Event):
        """
        Update analytics for flashcard reviews in DuckDB.

        Inserts review record with SM-2 parameters and calculates aggregates.

        Args:
            event: Review event with quality score and SM-2 data
        """
        try:
            review_data = {
                "user_id": event.user_id,
                "card_id": event.data.get("card_id"),
                "quality": event.data.get("quality"),
                "ease_factor": event.data.get("new_ease_factor"),
                "interval": event.data.get("new_interval"),
                "repetitions": event.data.get("new_repetitions"),
                "reviewed_at": event.timestamp,
            }

            # Insert into flashcard_reviews table
            insert_query = """
            INSERT INTO flashcard_reviews (
                user_id, card_id, quality, ease_factor, interval,
                repetitions, reviewed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """

            params = (
                review_data["user_id"],
                review_data["card_id"],
                review_data["quality"],
                review_data["ease_factor"],
                review_data["interval"],
                review_data["repetitions"],
                review_data["reviewed_at"]
            )

            await self.duckdb_client.execute(insert_query, params)

            logger.debug(
                "review_analytics_inserted",
                user_id=event.user_id,
                card_id=review_data["card_id"],
                quality=review_data["quality"]
            )

        except Exception as e:
            logger.error(
                "failed_to_update_review_analytics",
                event_type=event.type.value,
                error=str(e),
                exc_info=True
            )

    async def _update_session_analytics(self, event: Event):
        """
        Update analytics for study sessions in DuckDB.

        Records session completion with performance metrics and timing.

        Args:
            event: Session completed event with performance data
        """
        try:
            session_data = {
                "user_id": event.user_id,
                "session_id": event.data.get("session_id"),
                "session_type": event.data.get("session_type", "study"),
                "items_completed": event.data.get("items_completed", 0),
                "items_correct": event.data.get("items_correct", 0),
                "duration_seconds": event.data.get("duration_seconds", 0),
                "completed_at": event.timestamp,
            }

            # Calculate accuracy percentage
            accuracy = 0.0
            if session_data["items_completed"] > 0:
                accuracy = (session_data["items_correct"] / session_data["items_completed"]) * 100

            # Insert into learning_sessions table
            insert_query = """
            INSERT INTO learning_sessions (
                user_id, session_id, session_type, items_completed,
                items_correct, accuracy, duration_seconds, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """

            params = (
                session_data["user_id"],
                session_data["session_id"],
                session_data["session_type"],
                session_data["items_completed"],
                session_data["items_correct"],
                accuracy,
                session_data["duration_seconds"],
                session_data["completed_at"]
            )

            await self.duckdb_client.execute(insert_query, params)

            logger.debug(
                "session_analytics_inserted",
                user_id=event.user_id,
                session_id=session_data["session_id"],
                items_completed=session_data["items_completed"],
                accuracy=accuracy
            )

        except Exception as e:
            logger.error(
                "failed_to_update_session_analytics",
                event_type=event.type.value,
                error=str(e),
                exc_info=True
            )

    async def _update_quiz_analytics(self, event: Event):
        """
        Update analytics for quiz completion in DuckDB.

        Records quiz attempt with scoring and time metrics.

        Args:
            event: Quiz completed event with score and timing
        """
        try:
            quiz_data = {
                "user_id": event.user_id,
                "quiz_id": event.data.get("quiz_id"),
                "attempt_id": event.data.get("attempt_id"),
                "score": event.data.get("score", 0),
                "max_score": event.data.get("max_score", 100),
                "percentage": event.data.get("percentage", 0.0),
                "time_taken_seconds": event.data.get("time_taken_seconds", 0),
                "completed_at": event.timestamp,
            }

            # Insert into quiz_results table
            insert_query = """
            INSERT INTO quiz_results (
                user_id, quiz_id, attempt_id, score, max_score,
                percentage, time_taken_seconds, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """

            params = (
                quiz_data["user_id"],
                quiz_data["quiz_id"],
                quiz_data["attempt_id"],
                quiz_data["score"],
                quiz_data["max_score"],
                quiz_data["percentage"],
                quiz_data["time_taken_seconds"],
                quiz_data["completed_at"]
            )

            await self.duckdb_client.execute(insert_query, params)

            logger.debug(
                "quiz_analytics_inserted",
                user_id=event.user_id,
                quiz_id=quiz_data["quiz_id"],
                score=quiz_data["score"],
                percentage=quiz_data["percentage"]
            )

        except Exception as e:
            logger.error(
                "failed_to_update_quiz_analytics",
                event_type=event.type.value,
                error=str(e),
                exc_info=True
            )

    async def _update_content_analytics(self, event: Event):
        """
        Update analytics for content creation in DuckDB.

        Tracks content creation events for engagement and productivity metrics.

        Args:
            event: Content creation event (card, note, or document)
        """
        try:
            # Extract content type from event type (e.g., CARD_CREATED -> card)
            content_type = event.type.value.split('_')[0].lower()

            content_data = {
                "user_id": event.user_id,
                "content_type": content_type,
                "content_id": event.data.get("id"),
                "created_at": event.timestamp,
            }

            # Insert into content_activity table
            insert_query = """
            INSERT INTO content_activity (
                user_id, content_type, content_id, created_at
            ) VALUES (?, ?, ?, ?)
            """

            params = (
                content_data["user_id"],
                content_data["content_type"],
                content_data["content_id"],
                content_data["created_at"]
            )

            await self.duckdb_client.execute(insert_query, params)

            logger.debug(
                "content_analytics_inserted",
                user_id=event.user_id,
                content_type=content_data["content_type"],
                content_id=content_data["content_id"]
            )

        except Exception as e:
            logger.error(
                "failed_to_update_content_analytics",
                event_type=event.type.value,
                error=str(e),
                exc_info=True
            )

    async def refresh_materialized_views(self):
        """
        Refresh PostgreSQL materialized views for dashboards.

        This should be called periodically (e.g., hourly) via a scheduled task
        to keep user dashboard statistics fresh without constant recalculation.
        """
        if not self.db_session:
            logger.warning("no_db_session_cannot_refresh_views")
            return

        try:
            logger.info("refreshing_materialized_views")

            # List of materialized views to refresh
            views = [
                "user_dashboard_stats",      # User statistics summary
                "module_performance",        # Per-module performance
                "learning_insights",        # Learning insights and trends
            ]

            refresh_count = 0
            for view_name in views:
                try:
                    # Concurrent refresh to avoid blocking reads
                    refresh_query = f"REFRESH MATERIALIZED VIEW CONCURRENTLY {view_name}"
                    await self.db_session.execute(refresh_query)
                    refresh_count += 1
                    logger.debug("view_refreshed", view=view_name)
                except Exception as e:
                    logger.error(
                        "view_refresh_failed",
                        view=view_name,
                        error=str(e)
                    )

            await self.db_session.commit()
            logger.info("materialized_views_refreshed", count=refresh_count)

        except Exception as e:
            logger.error(
                "failed_to_refresh_materialized_views",
                error=str(e),
                exc_info=True
            )
            try:
                await self.db_session.rollback()
            except Exception as rollback_error:
                logger.error("rollback_failed", error=str(rollback_error))
