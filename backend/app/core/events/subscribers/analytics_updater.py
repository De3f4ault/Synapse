"""
Analytics Update Subscriber

Refreshes PostgreSQL materialized views when learning events occur.
"""

from typing import List
from datetime import datetime
import logging

from sqlalchemy import text

from .base import BaseSubscriber
from ..triggers import Event, EventType

logger = logging.getLogger(__name__)


class AnalyticsUpdateSubscriber(BaseSubscriber):
    """
    Subscriber that refreshes analytics when learning events occur.

    Since review, session, and quiz data is already written to PostgreSQL
    by the REST layer, this subscriber only needs to:
    1. Refresh materialized views for dashboard performance
    2. Log analytics events for auditing
    """

    def __init__(self, db_session=None):
        """
        Initialize analytics update subscriber.

        Args:
            db_session: SQLAlchemy async session for PostgreSQL
        """
        super().__init__()
        self.db_session = db_session

    def get_subscribed_events(self) -> List[EventType]:
        """Events that trigger analytics updates."""
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
        Handle analytics event.

        Since data is already in PostgreSQL from the REST layer,
        we only log the event and optionally refresh materialized views
        for heavy-traffic events.

        Args:
            event: Event triggering analytics update
        """
        try:
            logger.info(
                "analytics_event_received",
                event_type=event.type.value,
                user_id=event.user_id,
            )

            # For session/quiz completion, refresh materialized views
            # to keep dashboard data fresh
            if event.type in [
                EventType.STUDY_SESSION_COMPLETED,
                EventType.QUIZ_COMPLETED,
            ]:
                await self.refresh_materialized_views()

        except Exception as e:
            logger.error(
                "analytics_update_failed",
                event_type=event.type.value,
                user_id=event.user_id,
                error=str(e),
                exc_info=True,
            )

    async def refresh_materialized_views(self):
        """
        Refresh PostgreSQL materialized views for dashboards.

        Called after significant learning events to keep dashboard
        statistics fresh without constant recalculation.
        """
        if not self.db_session:
            logger.warning("no_db_session_cannot_refresh_views")
            return

        try:
            logger.info("refreshing_materialized_views")

            views = [
                "user_dashboard_stats",
                "module_performance",
                "learning_insights",
            ]

            refresh_count = 0
            for view_name in views:
                try:
                    await self.db_session.execute(
                        text(f"REFRESH MATERIALIZED VIEW CONCURRENTLY {view_name}")
                    )
                    refresh_count += 1
                    logger.debug("view_refreshed", view=view_name)
                except Exception as e:
                    # View may not exist yet — this is non-fatal
                    logger.debug(
                        "view_refresh_skipped",
                        view=view_name,
                        reason=str(e),
                    )

            await self.db_session.commit()
            logger.info("materialized_views_refreshed", count=refresh_count)

        except Exception as e:
            logger.error(
                "failed_to_refresh_materialized_views",
                error=str(e),
                exc_info=True,
            )
            try:
                await self.db_session.rollback()
            except Exception as rollback_error:
                logger.error("rollback_failed", error=str(rollback_error))
