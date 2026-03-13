"""
Analytics service — thin Python wrapper over PostgreSQL functions.

SQL functions in: app/sql/functions/analytics/
Schemas in: app/schemas/analytics.py

Learning Ledger helpers (streak, duration, event counts) are kept here
for the ENABLE_LEARNING_LEDGER feature gate.
"""

import json
from datetime import datetime, timedelta

from sqlalchemy import select, and_, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity_log import ActivityLog
from app.core.config import settings
from app.utils.logging import get_logger

logger = get_logger(__name__)


# ============================================================================
# SQL Function Wrappers
# ============================================================================


async def get_dashboard_overview(user_id: int, db: AsyncSession) -> dict:
    """Call get_dashboard_overview SQL function. Returns dict of dashboard metrics."""
    result = await db.execute(
        text("SELECT developer_schema.get_dashboard_overview(:uid)"),
        {"uid": user_id},
    )
    raw = result.scalar()
    if raw is None:
        return {}
    return raw if isinstance(raw, dict) else json.loads(raw)


async def get_review_forecast(user_id: int, db: AsyncSession) -> dict:
    """Call get_review_forecast SQL function."""
    result = await db.execute(
        text("SELECT developer_schema.get_review_forecast(:uid)"),
        {"uid": user_id},
    )
    raw = result.scalar()
    if raw is None:
        return {"due_today": 0, "due_tomorrow": 0, "due_this_week": 0, "overdue": 0}
    return raw if isinstance(raw, dict) else json.loads(raw)


async def get_performance_trends(
    user_id: int, db: AsyncSession, days: int = 30, bucket: str = "day"
) -> list:
    """Call get_performance_trends SQL function. Returns list of trend dicts."""
    result = await db.execute(
        text(
            "SELECT developer_schema.get_performance_trends(:uid, :days, :bucket)"
        ),
        {"uid": user_id, "days": days, "bucket": bucket},
    )
    raw = result.scalar()
    if raw is None:
        return []
    return raw if isinstance(raw, list) else json.loads(raw)


async def get_weak_areas(user_id: int, db: AsyncSession, limit: int = 10) -> list:
    """Call get_weak_areas SQL function."""
    result = await db.execute(
        text("SELECT developer_schema.get_weak_areas(:uid, :lim)"),
        {"uid": user_id, "lim": limit},
    )
    raw = result.scalar()
    if raw is None:
        return []
    return raw if isinstance(raw, list) else json.loads(raw)


async def get_heatmap_data(user_id: int, db: AsyncSession, days: int = 365) -> list:
    """Call get_heatmap_data SQL function."""
    result = await db.execute(
        text("SELECT developer_schema.get_heatmap_data(:uid, :days)"),
        {"uid": user_id, "days": days},
    )
    raw = result.scalar()
    if raw is None:
        return []
    return raw if isinstance(raw, list) else json.loads(raw)


async def get_topic_mastery(user_id: int, db: AsyncSession) -> list:
    """Call get_topic_mastery SQL function."""
    result = await db.execute(
        text("SELECT developer_schema.get_topic_mastery(:uid)"),
        {"uid": user_id},
    )
    raw = result.scalar()
    if raw is None:
        return []
    return raw if isinstance(raw, list) else json.loads(raw)


async def get_today_stats(user_id: int, db: AsyncSession) -> dict:
    """Call get_today_stats SQL function."""
    result = await db.execute(
        text("SELECT developer_schema.get_today_stats(:uid)"),
        {"uid": user_id},
    )
    raw = result.scalar()
    if raw is None:
        return {"study_time_minutes": 0, "learning_events": 0, "reviews_completed": 0, "average_accuracy": 0.0}
    return raw if isinstance(raw, dict) else json.loads(raw)


async def get_last_session(user_id: int, db: AsyncSession, window_minutes: int = 45) -> dict:
    """Call get_last_session SQL function."""
    result = await db.execute(
        text("SELECT developer_schema.get_last_session(:uid, :win)"),
        {"uid": user_id, "win": window_minutes},
    )
    raw = result.scalar()
    if raw is None:
        return {
            "cards_reviewed": 0, "duration_minutes": 0, "accuracy_percent": 0.0,
            "quality_label": "No sessions yet", "ended_at": None, "has_session": False,
        }
    return raw if isinstance(raw, dict) else json.loads(raw)


# ============================================================================
# Learning Ledger Helpers (kept for feature gate)
# ============================================================================


async def calculate_consecutive_streak(user_id: int, db: AsyncSession) -> int:
    """Calculate consecutive days with learning events, starting from today."""
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
