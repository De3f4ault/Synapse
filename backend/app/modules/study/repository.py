"""
Study Session Repository

SQL queries for study session operations.
"""

from typing import Dict, List
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text


class StudyRepository:
    """
    Repository for study session SQL operations.

    Handles complex analytics queries.
    """

    def __init__(self, session: AsyncSession):
        """Initialize repository with database session."""
        self.session = session

    async def get_study_stats(
        self,
        user_id: int,
        days: int = 30
    ) -> Dict:
        """
        Get study statistics for a user.

        Args:
            user_id: User ID
            days: Number of days to look back

        Returns:
            Dictionary with study statistics
        """
        query = text("""
            SELECT
                COUNT(*) as total_sessions,
                SUM(items_completed) as total_items,
                SUM(items_correct) as total_correct,
                SUM(time_spent_seconds) as total_time,
                AVG(CASE
                    WHEN items_completed > 0
                    THEN (items_correct::FLOAT / items_completed) * 100
                    ELSE 0
                END) as avg_accuracy
            FROM developer_schema.study_sessions
            WHERE user_id = :user_id
              AND started_at >= NOW() - INTERVAL ':days days'
              AND ended_at IS NOT NULL
        """)

        result = await self.session.execute(
            query,
            {"user_id": user_id, "days": days}
        )

        row = result.fetchone()

        if not row:
            return {
                "total_sessions": 0,
                "total_items": 0,
                "total_correct": 0,
                "total_time_seconds": 0,
                "avg_accuracy": 0.0
            }

        return {
            "total_sessions": row.total_sessions or 0,
            "total_items": row.total_items or 0,
            "total_correct": row.total_correct or 0,
            "total_time_seconds": row.total_time or 0,
            "avg_accuracy": float(row.avg_accuracy or 0.0)
        }

    async def get_daily_study_time(
        self,
        user_id: int,
        days: int = 30
    ) -> List[Dict]:
        """
        Get daily study time for charts.

        Args:
            user_id: User ID
            days: Number of days to look back

        Returns:
            List of {date, minutes} dictionaries
        """
        query = text("""
            SELECT
                DATE(started_at) as date,
                SUM(time_spent_seconds) / 60 as minutes
            FROM developer_schema.study_sessions
            WHERE user_id = :user_id
              AND started_at >= NOW() - INTERVAL ':days days'
              AND ended_at IS NOT NULL
            GROUP BY DATE(started_at)
            ORDER BY date ASC
        """)

        result = await self.session.execute(
            query,
            {"user_id": user_id, "days": days}
        )

        rows = result.fetchall()

        return [
            {
                "date": row.date.isoformat(),
                "minutes": int(row.minutes or 0)
            }
            for row in rows
        ]
