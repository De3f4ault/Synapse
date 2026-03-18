"""
Report generation utilities for analytics.

Generates formatted reports from analytics data including
user summaries, performance reports, and usage insights.
All queries run against PostgreSQL via SQLAlchemy async sessions.
"""

import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .queries import UserAnalyticsQueries

logger = logging.getLogger(__name__)


class ReportGenerator:
    """
    Generate analytical reports from PostgreSQL data.

    Creates formatted reports for different stakeholders
    with key metrics and performance data.
    """

    def __init__(self, db_session: AsyncSession):
        """
        Initialize report generator.

        Args:
            db_session: SQLAlchemy async session for PostgreSQL
        """
        self.db = db_session
        self.queries = UserAnalyticsQueries(db_session)
        logger.debug("Initialized ReportGenerator")

    async def generate_user_report(
        self, user_id: int, period_days: int = 30
    ) -> Dict[str, Any]:
        """
        Generate comprehensive user activity report.

        Args:
            user_id: User ID
            period_days: Report period in days

        Returns:
            dict: User report data
        """
        summary = await self.queries.get_user_learning_summary(user_id)
        trends = await self.queries.get_performance_trends(user_id, period_days)
        streaks = await self.queries.get_study_streaks(user_id)
        velocity = await self.queries.get_learning_velocity(user_id, min(period_days, 14))
        mastery = await self.queries.get_mastery_scores(user_id)
        weak_areas = await self.queries.get_weak_areas(user_id)

        return {
            "user_id": user_id,
            "period_days": period_days,
            "generated_at": datetime.utcnow().isoformat(),
            "learning_summary": summary,
            "performance_trends": trends,
            "streaks": streaks,
            "learning_velocity": velocity,
            "mastery_by_deck": mastery[:10],
            "weak_areas": weak_areas[:10],
        }

    async def generate_system_health_report(
        self, period_hours: int = 24
    ) -> Dict[str, Any]:
        """
        Generate system health and performance report from PostgreSQL.

        Args:
            period_hours: Report period in hours

        Returns:
            dict: System health report
        """
        try:
            result = await self.db.execute(
                text("""
                    SELECT
                        COUNT(*) AS total_reviews,
                        COUNT(DISTINCT user_id) AS unique_users,
                        AVG(CASE WHEN quality >= 3 THEN 1.0 ELSE 0.0 END) * 100 AS avg_accuracy
                    FROM reviews
                    WHERE reviewed_at >= NOW() - :hours * INTERVAL '1 hour'
                """),
                {"hours": period_hours},
            )
            row = result.first()

            # Hourly breakdown
            hourly = await self.db.execute(
                text("""
                    SELECT
                        DATE_TRUNC('hour', reviewed_at) AS hour,
                        COUNT(*) AS review_count
                    FROM reviews
                    WHERE reviewed_at >= NOW() - :hours * INTERVAL '1 hour'
                    GROUP BY DATE_TRUNC('hour', reviewed_at)
                    ORDER BY hour
                """),
                {"hours": period_hours},
            )

            return {
                "report_period_hours": period_hours,
                "generated_at": datetime.utcnow().isoformat(),
                "overall_metrics": {
                    "total_reviews": int(row.total_reviews) if row else 0,
                    "unique_users": int(row.unique_users) if row else 0,
                    "avg_accuracy": float(row.avg_accuracy or 0) if row else 0.0,
                },
                "hourly_breakdown": [
                    {
                        "hour": str(r.hour),
                        "review_count": int(r.review_count),
                    }
                    for r in hourly.all()
                ],
            }

        except Exception as e:
            logger.error(f"Error generating system health report: {e}")
            return {
                "report_period_hours": period_hours,
                "generated_at": datetime.utcnow().isoformat(),
                "error": str(e),
            }

    async def generate_weekly_summary(
        self, user_id: int, week_offset: int = 0
    ) -> Dict[str, Any]:
        """
        Generate weekly summary report.

        Args:
            user_id: User ID
            week_offset: Weeks back from current (0 = this week)

        Returns:
            dict: Weekly summary report
        """
        end_date = datetime.utcnow() - timedelta(weeks=week_offset)
        start_date = end_date - timedelta(days=7)

        trends = await self.queries.get_performance_trends(user_id, days=7)
        velocity = await self.queries.get_learning_velocity(user_id, days=7)
        mastery = await self.queries.get_mastery_scores(user_id)

        return {
            "user_id": user_id,
            "week_start": start_date.isoformat(),
            "week_end": end_date.isoformat(),
            "generated_at": datetime.utcnow().isoformat(),
            "daily_performance": trends,
            "learning_velocity": velocity,
            "top_decks_by_mastery": mastery[:5],
        }
