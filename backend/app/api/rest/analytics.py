"""
Analytics REST API endpoints.

Thin controller — business logic lives in:
- SQL functions: app/sql/functions/analytics/
- Service layer: app/services/analytics_service.py
- Schemas: app/schemas/analytics.py
"""

from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.core.config import settings
from app.schemas.analytics import (
    TimeBucket,
    DashboardOverview,
    WeakArea,
    PerformanceTrend,
    TopicMastery,
    HeatmapData,
    TodayStats,
    ReviewForecast,
    LastSessionStats,
)
from app.services.analytics.service import (
    get_dashboard_overview as svc_get_dashboard_overview,
    get_review_forecast as svc_get_review_forecast,
    get_performance_trends as svc_get_performance_trends,
    get_weak_areas as svc_get_weak_areas,
    get_heatmap_data as svc_get_heatmap_data,
    get_topic_mastery as svc_get_topic_mastery,
    get_today_stats as svc_get_today_stats,
    get_last_session as svc_get_last_session,
    # Learning Ledger helpers (for feature gate in overview)
    calculate_consecutive_streak,
    sum_learning_duration,
    count_learning_events,
)

router = APIRouter()
logger = structlog.get_logger(__name__)


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/overview", response_model=DashboardOverview)
async def get_overview(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """
    Get dashboard overview from pre-computed materialized view.

    Falls back to direct queries if view not available.
    Performance: 1 SQL function call vs 8 Python queries.
    """
    data = await svc_get_dashboard_overview(current_user.id, db)

    # If LEARNING_LEDGER is enabled, override streak/duration with canonical source
    if settings.ENABLE_LEARNING_LEDGER and data.get("data_source") != "materialized_view":
        study_streak = await calculate_consecutive_streak(current_user.id, db)
        total_study_minutes = await sum_learning_duration(current_user.id, db)
        learning_events = await count_learning_events(current_user.id, db, days=30)
        data.update({
            "study_streak_days": study_streak,
            "total_study_time_minutes": total_study_minutes,
            "total_learning_events": learning_events,
            "analytics_version": "2.0.0-learning-ledger",
            "data_sources": {
                "streak": "Consecutive UTC days with learning events",
                "duration": "Sum of duration_seconds from learning events (capped)",
            },
        })
    else:
        data.setdefault("analytics_version", "2.0.0-quiz")
        data.setdefault("data_sources", {"source": data.get("data_source", "unknown")})

    return DashboardOverview(**data)


@router.get("/weak-areas", response_model=List[WeakArea])
async def get_weak_areas(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Identify weak areas based on review performance."""
    rows = await svc_get_weak_areas(current_user.id, db, limit)
    return [WeakArea(**row) for row in rows]


@router.get("/performance", response_model=List[PerformanceTrend])
async def get_performance(
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    bucket: TimeBucket = Query(TimeBucket.DAY, description="Time bucket: day, week, or month"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get performance trends over time with configurable time buckets."""
    rows = await svc_get_performance_trends(current_user.id, db, days, bucket.value)
    logger.info("performance_trends", user_id=current_user.id, bucket=bucket.value, days=days, points=len(rows))
    return [PerformanceTrend(**row) for row in rows]


@router.get("/heatmap", response_model=List[HeatmapData])
async def get_heatmap(
    days: int = Query(365, ge=1, le=730, description="Number of days"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get activity heatmap data (for visualization)."""
    rows = await svc_get_heatmap_data(current_user.id, db, days)
    return [HeatmapData(**row) for row in rows]


@router.get("/topics", response_model=List[TopicMastery])
async def get_topic_mastery(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """Get mastery levels per topic/deck."""
    rows = await svc_get_topic_mastery(current_user.id, db)
    return [TopicMastery(**row) for row in rows]


@router.get("/today", response_model=TodayStats)
async def get_today_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get today's study statistics from the Learning Ledger."""
    data = await svc_get_today_stats(current_user.id, db)
    data["data_source"] = "learning_ledger" if settings.ENABLE_LEARNING_LEDGER else "legacy"
    return TodayStats(**data)


@router.get("/forecast", response_model=ReviewForecast)
async def get_forecast(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get review forecast — cards due today, tomorrow, this week, and overdue."""
    data = await svc_get_review_forecast(current_user.id, db)
    return ReviewForecast(**data)


@router.get("/last-session", response_model=LastSessionStats)
async def get_last_session(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get last study session quality feedback (45-min session window)."""
    data = await svc_get_last_session(current_user.id, db)
    return LastSessionStats(**data)


@router.post("/export")
async def export_analytics(
    format: str = Query("csv", regex="^(csv|json)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export analytics data."""
    return {"message": "Export functionality to be implemented", "format": format}
