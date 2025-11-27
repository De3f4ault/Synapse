"""
Activity Repository

SQL queries for activity log operations.
"""

from typing import Dict, List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text


class ActivityRepository:
    """
    Repository for activity-related SQL operations.

    Handles complex queries for:
    - Activity aggregation
    - Session detection queries
    - Analytics queries
    """

    def __init__(self, session: AsyncSession):
        """Initialize repository with database session."""
        self.session = session

    async def get_activity_summary(
        self,
        user_id: int,
        days: int = 30
    ) -> Dict:
        """
        Get activity summary for a user.

        Returns counts by module and activity type.

        Args:
            user_id: User ID
            days: Number of days to look back

        Returns:
            Dictionary with activity counts
        """
        query = text("""
            SELECT
                module,
                activity_type,
                COUNT(*) as count
            FROM developer_schema.activity_logs
            WHERE user_id = :user_id
              AND created_at >= NOW() - INTERVAL ':days days'
            GROUP BY module, activity_type
            ORDER BY count DESC
        """)

        result = await self.session.execute(
            query,
            {"user_id": user_id, "days": days}
        )

        rows = result.fetchall()

        # Build summary structure
        summary = {
            "total": 0,
            "by_module": {},
            "by_type": {}
        }

        for row in rows:
            module = row.module
            activity_type = row.activity_type
            count = row.count

            summary["total"] += count

            if module not in summary["by_module"]:
                summary["by_module"][module] = 0
            summary["by_module"][module] += count

            if activity_type not in summary["by_type"]:
                summary["by_type"][activity_type] = 0
            summary["by_type"][activity_type] += count

        return summary

    async def get_daily_activity_counts(
        self,
        user_id: int,
        days: int = 30
    ) -> List[Dict]:
        """
        Get daily activity counts for heatmap/chart.

        Args:
            user_id: User ID
            days: Number of days to look back

        Returns:
            List of {date, count} dictionaries
        """
        query = text("""
            SELECT
                DATE(created_at) as date,
                COUNT(*) as count
            FROM developer_schema.activity_logs
            WHERE user_id = :user_id
              AND created_at >= NOW() - INTERVAL ':days days'
            GROUP BY DATE(created_at)
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
                "count": row.count
            }
            for row in rows
        ]

    async def get_most_active_hours(
        self,
        user_id: int,
        days: int = 30
    ) -> List[Dict]:
        """
        Get activity distribution by hour of day.

        Args:
            user_id: User ID
            days: Number of days to look back

        Returns:
            List of {hour, count} dictionaries
        """
        query = text("""
            SELECT
                EXTRACT(HOUR FROM created_at) as hour,
                COUNT(*) as count
            FROM developer_schema.activity_logs
            WHERE user_id = :user_id
              AND created_at >= NOW() - INTERVAL ':days days'
            GROUP BY EXTRACT(HOUR FROM created_at)
            ORDER BY hour ASC
        """)

        result = await self.session.execute(
            query,
            {"user_id": user_id, "days": days}
        )

        rows = result.fetchall()

        return [
            {
                "hour": int(row.hour),
                "count": row.count
            }
            for row in rows
        ]
