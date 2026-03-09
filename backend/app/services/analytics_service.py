"""
Analytics / Learning Ledger service.

Extracted from rest/analytics.py — centralizes Learning Ledger metric queries
(streak, duration, event counts) away from the HTTP layer.
"""

from datetime import datetime, timedelta

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity_log import ActivityLog
from app.utils.logging import get_logger

logger = get_logger(__name__)


async def calculate_consecutive_streak(user_id: int, db: AsyncSession) -> int:
    """
    Calculate consecutive days with learning events, starting from today.

    Streaks are computed in UTC for consistency.
    """
    today = datetime.utcnow().date()

    result = await db.execute(
        select(func.distinct(func.date(ActivityLog.created_at))).where(
            and_(
                ActivityLog.user_id == user_id,
                ActivityLog.is_learning_event == True,  # noqa: E712
                ActivityLog.created_at >= datetime.utcnow() - timedelta(days=365),
            )
        )
    )
    learning_dates = {row[0] for row in result.all()}

    streak = 0
    check_date = today
    while check_date in learning_dates:
        streak += 1
        check_date -= timedelta(days=1)

    return streak


async def sum_learning_duration(user_id: int, db: AsyncSession) -> int:
    """Sum duration_seconds from learning events. Returns total minutes."""
    result = await db.execute(
        select(func.sum(ActivityLog.duration_seconds)).where(
            and_(
                ActivityLog.user_id == user_id,
                ActivityLog.is_learning_event == True,  # noqa: E712
                ActivityLog.duration_seconds.isnot(None),
            )
        )
    )
    total_seconds = result.scalar() or 0
    return total_seconds // 60


async def count_learning_events(user_id: int, db: AsyncSession, days: int = 30) -> int:
    """Count learning events in the specified period."""
    since = datetime.utcnow() - timedelta(days=days)
    result = await db.execute(
        select(func.count(ActivityLog.id)).where(
            and_(
                ActivityLog.user_id == user_id,
                ActivityLog.is_learning_event == True,  # noqa: E712
                ActivityLog.created_at >= since,
            )
        )
    )
    return result.scalar() or 0
