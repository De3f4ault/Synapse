"""
Analytics REST API endpoints.

Learning analytics, progress tracking, and performance insights with SQL aggregations.

LEARNING LEDGER: When ENABLE_LEARNING_LEDGER is True, streak and duration
metrics are computed from ActivityLog (canonical source of truth).
"""

from typing import List, Dict, Optional
from datetime import datetime, timedelta, date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, case, Float
from pydantic import BaseModel
import structlog

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.flashcard import Flashcard, LearningState
from app.models.deck import Deck
from app.models.review import Review
from app.models.note import Note
from app.models.document import Document
from app.models.study_session import StudySession
from app.models.activity_log import ActivityLog, ActivityType
from app.core.config import settings

router = APIRouter()
logger = structlog.get_logger(__name__)


# ============================================================================
# Learning Ledger Helpers (v2.0)
# ============================================================================


async def calculate_consecutive_streak(user_id: int, db: AsyncSession) -> int:
    """
    Calculate consecutive days with learning events, starting from today.

    Streaks are computed in UTC for consistency.
    """
    today = datetime.utcnow().date()

    # Get distinct dates with learning events (last 365 days for efficiency)
    result = await db.execute(
        select(func.distinct(func.date(ActivityLog.created_at))).where(
            and_(
                ActivityLog.user_id == user_id,
                ActivityLog.is_learning_event == True,
                ActivityLog.created_at >= datetime.utcnow() - timedelta(days=365),
            )
        )
    )
    learning_dates = {row[0] for row in result.all()}

    # Count consecutive days backwards from today
    streak = 0
    check_date = today
    while check_date in learning_dates:
        streak += 1
        check_date -= timedelta(days=1)

    return streak


async def sum_learning_duration(user_id: int, db: AsyncSession) -> int:
    """
    Sum duration_seconds from learning events.

    Returns total study time in minutes.
    """
    result = await db.execute(
        select(func.sum(ActivityLog.duration_seconds)).where(
            and_(
                ActivityLog.user_id == user_id,
                ActivityLog.is_learning_event == True,
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
                ActivityLog.is_learning_event == True,
                ActivityLog.created_at >= since,
            )
        )
    )
    return result.scalar() or 0


# ============================================================================
# Aggregation Contract (Phase 3.5 - Design Now, Implement Later)
# ============================================================================
# These types define HOW metrics are aggregated over time buckets.
# Currently: DAY only, EVENT_WEIGHTED only. Toggle deferred to Phase 3.5.

from enum import Enum


class TimeBucket(str, Enum):
    """Time bucket for aggregation (future toggle)."""

    DAY = "day"
    WEEK = "week"
    MONTH = "month"


class AggregationStrategy(str, Enum):
    """
    How to aggregate accuracy/performance across time buckets.

    EVENT_WEIGHTED: Average of individual event accuracies
    DURATION_WEIGHTED: Average weighted by event duration (thoughtful study = more weight)
    """

    EVENT_WEIGHTED = "event_weighted"  # Default: simple average of events
    DURATION_WEIGHTED = "duration_weighted"  # Future: weight by study time


# Canonical default - this is the semantic contract
DEFAULT_TIME_BUCKET = TimeBucket.DAY
DEFAULT_AGGREGATION = AggregationStrategy.EVENT_WEIGHTED


# ============================================================================
# Schemas
# ============================================================================


class DashboardOverview(BaseModel):
    """Dashboard overview statistics with flashcard + quiz metrics."""

    # ===== COMBINED METRICS =====
    total_study_time_minutes: int
    overall_accuracy: float
    total_learning_events: int = 0
    study_streak_days: int

    # ===== FLASHCARD METRICS =====
    total_cards: int
    due_cards: int
    cards_reviewed_today: int
    total_decks: int
    flashcard_accuracy: float = 0.0
    flashcard_study_time_minutes: int = 0
    total_flashcard_reviews: int = 0

    # ===== QUIZ METRICS =====
    total_quizzes: int = 0
    total_quiz_attempts: int = 0
    quiz_accuracy: float = 0.0
    quiz_study_time_minutes: int = 0

    # ===== OTHER =====
    total_notes: int
    total_documents: int

    # Analytics versioning (Learning Ledger v2.0)
    analytics_version: str = "2.0.0-quiz"
    learning_event_count: int = 0
    data_sources: Dict[str, str] = {}


class WeakArea(BaseModel):
    """Weak area identification."""

    topic: str
    accuracy: float
    review_count: int
    severity: str  # "high", "medium", "low"


class PerformanceTrend(BaseModel):
    """Performance over time."""

    date: str
    reviews_count: int
    accuracy: float
    study_time_minutes: int


class TopicMastery(BaseModel):
    """Mastery level per topic."""

    topic: str
    mastery_score: float  # 0.0 - 1.0
    card_count: int
    avg_ease_factor: float


class HeatmapData(BaseModel):
    """Activity heatmap data point."""

    date: str
    activity_count: int


class TodayStats(BaseModel):
    """Today's study statistics from Learning Ledger."""

    study_time_minutes: int
    learning_events: int
    reviews_completed: int
    average_accuracy: float
    data_source: str = "learning_ledger"


class ReviewForecast(BaseModel):
    """Review forecast for planning."""

    due_today: int
    due_tomorrow: int
    due_this_week: int
    overdue: int


class LastSessionStats(BaseModel):
    """Last study session quality feedback.

    Session boundary: Events within 45-min window from last activity.
    This is an explicit, simple rule (not magic inference).
    """

    cards_reviewed: int
    duration_minutes: int
    accuracy_percent: float
    quality_label: str  # "Strong", "Good", "Needs Practice"
    ended_at: str | None  # ISO timestamp of last event
    has_session: bool  # False if no recent session found


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
    Performance: 1 query vs 8 queries (original implementation).
    """
    from sqlalchemy import text

    try:
        # Try to use the materialized view (single query)
        result = await db.execute(
            text("""
                SELECT 
                    COALESCE(total_cards, 0) as total_cards,
                    COALESCE(due_cards, 0) as due_cards,
                    COALESCE(total_decks, 0) as total_decks,
                    COALESCE(total_notes, 0) as total_notes,
                    COALESCE(total_documents, 0) as total_documents,
                    COALESCE(study_days_last_30, 0) as study_streak_days,
                    COALESCE(overall_accuracy, 0) as overall_accuracy,
                    COALESCE(estimated_study_seconds / 60, 0) as total_study_time_minutes,
                    COALESCE(flashcard_accuracy, 0) as flashcard_accuracy,
                    COALESCE(flashcard_study_seconds / 60, 0) as flashcard_study_time_minutes,
                    COALESCE(total_flashcard_reviews, 0) as total_flashcard_reviews,
                    COALESCE(total_quizzes, 0) as total_quizzes,
                    COALESCE(total_quiz_attempts, 0) as total_quiz_attempts,
                    COALESCE(quiz_accuracy, 0) as quiz_accuracy,
                    COALESCE(quiz_study_seconds / 60, 0) as quiz_study_time_minutes,
                    COALESCE(total_learning_events, 0) as total_learning_events
                FROM developer_schema.user_dashboard_stats
                WHERE user_id = :uid
            """),
            {"uid": current_user.id},
        )
        row = result.mappings().first()

        if row:
            # View exists and has data - get today's reviews fresh
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            reviews_today_result = await db.execute(
                select(func.count(Review.id)).where(
                    and_(Review.user_id == current_user.id, Review.reviewed_at >= today_start)
                )
            )
            cards_reviewed_today = reviews_today_result.scalar() or 0

            return DashboardOverview(
                # Combined metrics
                total_study_time_minutes=int(row["total_study_time_minutes"]),
                overall_accuracy=float(row["overall_accuracy"]),
                total_learning_events=int(row["total_learning_events"]),
                study_streak_days=int(row["study_streak_days"]),
                # Flashcard metrics
                total_cards=int(row["total_cards"]),
                due_cards=int(row["due_cards"]),
                cards_reviewed_today=cards_reviewed_today,
                total_decks=int(row["total_decks"]),
                flashcard_accuracy=float(row["flashcard_accuracy"]),
                flashcard_study_time_minutes=int(row["flashcard_study_time_minutes"]),
                total_flashcard_reviews=int(row["total_flashcard_reviews"]),
                # Quiz metrics
                total_quizzes=int(row["total_quizzes"]),
                total_quiz_attempts=int(row["total_quiz_attempts"]),
                quiz_accuracy=float(row["quiz_accuracy"]),
                quiz_study_time_minutes=int(row["quiz_study_time_minutes"]),
                # Other
                total_notes=int(row["total_notes"]),
                total_documents=int(row["total_documents"]),
                analytics_version="2.0.0-quiz",
                learning_event_count=int(row["total_learning_events"]),
                data_sources={"source": "materialized_view_with_quiz"},
            )

    except Exception as e:
        # View query failed - fall back to direct queries
        # This catches ProgrammingError (view doesn't exist) or any other issue
        import structlog

        logger.warning("materialized_view_query_failed", error=str(e), user_id=current_user.id)

    # Fallback: direct queries (original 8-query implementation)
    # This runs if the materialized view is not deployed yet

    # Total cards
    total_cards_result = await db.execute(
        select(func.count(Flashcard.id))
        .join(Deck)
        .where(
            and_(
                Deck.user_id == current_user.id,
                Flashcard.deleted_at.is_(None),
                Deck.deleted_at.is_(None),
            )
        )
    )
    total_cards = total_cards_result.scalar() or 0

    # Due cards
    due_cards_result = await db.execute(
        select(func.count(Flashcard.id))
        .join(Deck)
        .where(
            and_(
                Deck.user_id == current_user.id,
                Flashcard.deleted_at.is_(None),
                Deck.deleted_at.is_(None),
                Flashcard.next_review <= datetime.utcnow(),
            )
        )
    )
    due_cards = due_cards_result.scalar() or 0

    # Cards reviewed today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    reviews_today_result = await db.execute(
        select(func.count(Review.id)).where(
            and_(Review.user_id == current_user.id, Review.reviewed_at >= today_start)
        )
    )
    cards_reviewed_today = reviews_today_result.scalar() or 0

    # Total decks
    total_decks_result = await db.execute(
        select(func.count(Deck.id)).where(
            and_(Deck.user_id == current_user.id, Deck.deleted_at.is_(None))
        )
    )
    total_decks = total_decks_result.scalar() or 0

    # Total notes
    total_notes_result = await db.execute(
        select(func.count(Note.id)).where(
            and_(Note.user_id == current_user.id, Note.deleted_at.is_(None))
        )
    )
    total_notes = total_notes_result.scalar() or 0

    # Total documents
    total_docs_result = await db.execute(
        select(func.count(Document.id)).where(
            and_(Document.user_id == current_user.id, Document.deleted_at.is_(None))
        )
    )
    total_documents = total_docs_result.scalar() or 0

    # =========================================================================
    # LEARNING LEDGER FEATURE GATE
    # =========================================================================
    if settings.ENABLE_LEARNING_LEDGER:
        # v2.0: Read from canonical ActivityLog learning events
        study_streak = await calculate_consecutive_streak(current_user.id, db)
        total_study_minutes = await sum_learning_duration(current_user.id, db)
        learning_events = await count_learning_events(current_user.id, db, days=30)
        analytics_version = "2.0.0-learning-ledger"
        data_sources = {
            "streak": "Consecutive UTC days with learning events",
            "duration": "Sum of duration_seconds from learning events (capped)",
            "accuracy": "Average quality from Review table (legacy)",
        }
        logger.info(
            "learning_ledger_metrics",
            user_id=current_user.id,
            streak=study_streak,
            duration_minutes=total_study_minutes,
            event_count=learning_events,
        )
    else:
        # v1.0: Legacy fallback (distinct review days, StudySession time)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        streak_result = await db.execute(
            select(func.count(func.distinct(func.date(Review.reviewed_at)))).where(
                and_(Review.user_id == current_user.id, Review.reviewed_at >= thirty_days_ago)
            )
        )
        study_streak = streak_result.scalar() or 0

        study_time_result = await db.execute(
            select(func.sum(StudySession.time_spent_seconds)).where(
                StudySession.user_id == current_user.id
            )
        )
        total_study_seconds = study_time_result.scalar() or 0
        total_study_minutes = total_study_seconds // 60

        learning_events = 0
        analytics_version = "1.0.0-legacy"
        data_sources = {}

    # Overall accuracy (same for both modes - could enhance later)
    accuracy_result = await db.execute(
        select(func.avg(case((Review.quality >= 3, 1), else_=0))).where(
            Review.user_id == current_user.id
        )
    )
    overall_accuracy = accuracy_result.scalar() or 0.0

    return DashboardOverview(
        total_cards=total_cards,
        due_cards=due_cards,
        cards_reviewed_today=cards_reviewed_today,
        total_decks=total_decks,
        total_notes=total_notes,
        total_documents=total_documents,
        study_streak_days=study_streak,
        overall_accuracy=float(overall_accuracy),
        total_study_time_minutes=total_study_minutes,
        analytics_version=analytics_version,
        learning_event_count=learning_events,
        data_sources=data_sources,
    )


@router.get("/weak-areas", response_model=List[WeakArea])
async def get_weak_areas(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Identify weak areas based on review performance.
    """
    weak_areas_query = (
        select(
            Deck.name,
            func.count(Review.id).label("review_count"),
            func.avg(case((Review.quality >= 3, 1), else_=0)).label("accuracy"),
        )
        .join(Flashcard, Flashcard.deck_id == Deck.id)
        .join(Review, Review.card_id == Flashcard.id)
        .where(Deck.user_id == current_user.id)
        .group_by(Deck.id, Deck.name)
        .having(func.avg(case((Review.quality >= 3, 1), else_=0)) < 0.7)
        .order_by(func.avg(case((Review.quality >= 3, 1), else_=0)).asc())
        .limit(limit)
    )

    result = await db.execute(weak_areas_query)
    rows = result.all()

    weak_areas = []
    for name, review_count, accuracy in rows:
        if accuracy < 0.5:
            severity = "high"
        elif accuracy < 0.6:
            severity = "medium"
        else:
            severity = "low"

        weak_areas.append(
            WeakArea(
                topic=name, accuracy=float(accuracy), review_count=review_count, severity=severity
            )
        )

    return weak_areas


@router.get("/performance", response_model=List[PerformanceTrend])
async def get_performance(
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    bucket: TimeBucket = Query(TimeBucket.DAY, description="Time bucket: day, week, or month"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get performance trends over time with configurable time buckets.

    Aggregation rules:
    - accuracy: AVG of all events in bucket (not avg of daily avgs)
    - reviews_count: COUNT of events in bucket
    - study_time_minutes: SUM of duration in bucket

    Buckets change resolution, not meaning.
    """
    from sqlalchemy import text

    start_date = datetime.utcnow() - timedelta(days=days)

    # =========================================================================
    # TIME BUCKET SQL - server-side aggregation (no client re-aggregation)
    # =========================================================================
    # Using date_trunc for consistent bucket boundaries
    # Week starts on Monday (ISO-8601)

    bucket_sql = {
        TimeBucket.DAY: "date_trunc('day', reviewed_at)",
        TimeBucket.WEEK: "date_trunc('week', reviewed_at)",  # ISO week (Monday)
        TimeBucket.MONTH: "date_trunc('month', reviewed_at)",
    }[bucket]

    # Build aggregated query using raw SQL for date_trunc
    performance_query = text(f"""
        SELECT 
            {bucket_sql} as bucket_start,
            COUNT(*) as reviews_count,
            AVG(CASE WHEN quality >= 3 THEN 1.0 ELSE 0.0 END) as accuracy
        FROM reviews
        WHERE user_id = :user_id AND reviewed_at >= :start_date
        GROUP BY {bucket_sql}
        ORDER BY bucket_start ASC
    """)

    result = await db.execute(
        performance_query, {"user_id": current_user.id, "start_date": start_date}
    )
    rows = result.all()

    # Study time aggregation (same bucket)
    study_bucket_sql = bucket_sql.replace("reviewed_at", "started_at")
    study_time_query = text(f"""
        SELECT 
            {study_bucket_sql} as bucket_start,
            SUM(time_spent_seconds) as total_seconds
        FROM study_sessions
        WHERE user_id = :user_id AND started_at >= :start_date
        GROUP BY {study_bucket_sql}
    """)

    study_time_result = await db.execute(
        study_time_query, {"user_id": current_user.id, "start_date": start_date}
    )
    study_time_by_bucket = {
        bucket_start: (total_seconds or 0) // 60
        for bucket_start, total_seconds in study_time_result.all()
    }

    trends = []
    for bucket_start, reviews_count, accuracy in rows:
        date_str = (
            bucket_start.isoformat() if hasattr(bucket_start, "isoformat") else str(bucket_start)
        )
        study_time = study_time_by_bucket.get(bucket_start, 0)

        trends.append(
            PerformanceTrend(
                date=date_str,
                reviews_count=reviews_count,
                accuracy=float(accuracy) if accuracy else 0.0,
                study_time_minutes=study_time,
            )
        )

    logger.info(
        "performance_trends",
        user_id=current_user.id,
        bucket=bucket.value,
        days=days,
        points=len(trends),
    )

    return trends


@router.get("/heatmap", response_model=List[HeatmapData])
async def get_heatmap(
    days: int = Query(365, ge=1, le=730, description="Number of days"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get activity heatmap data (for visualization)."""
    start_date = datetime.utcnow() - timedelta(days=days)

    heatmap_query = (
        select(
            func.date(Review.reviewed_at).label("date"),
            func.count(Review.id).label("activity_count"),
        )
        .where(and_(Review.user_id == current_user.id, Review.reviewed_at >= start_date))
        .group_by(func.date(Review.reviewed_at))
        .order_by(func.date(Review.reviewed_at).asc())
    )

    result = await db.execute(heatmap_query)
    rows = result.all()

    return [
        HeatmapData(
            date=date.isoformat() if hasattr(date, "isoformat") else str(date),
            activity_count=activity_count,
        )
        for date, activity_count in rows
    ]


@router.get("/topics", response_model=List[TopicMastery])
async def get_topic_mastery(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """
    Get mastery levels per topic/deck.
    """
    mastery_query = (
        select(
            Deck.name,
            func.count(Flashcard.id).label("card_count"),
            func.avg(Flashcard.ease_factor).label("avg_ease_factor"),
            func.avg(
                func.cast(Flashcard.times_correct, Float) / func.nullif(Flashcard.times_reviewed, 0)
            ).label("success_rate"),
        )
        .join(Flashcard, Flashcard.deck_id == Deck.id)
        .where(
            and_(
                Deck.user_id == current_user.id,
                Deck.deleted_at.is_(None),
                Flashcard.deleted_at.is_(None),
                Flashcard.times_reviewed > 0,
            )
        )
        .group_by(Deck.id, Deck.name)
        .order_by(func.avg(Flashcard.ease_factor).desc())
    )

    result = await db.execute(mastery_query)
    rows = result.all()

    topics = []
    for name, card_count, avg_ease_factor, success_rate in rows:
        ease_normalized = (float(avg_ease_factor) - 1.3) / (5.0 - 1.3) if avg_ease_factor else 0.5
        success = float(success_rate) if success_rate else 0.0
        mastery_score = (ease_normalized * 0.5) + (success * 0.5)

        topics.append(
            TopicMastery(
                topic=name,
                mastery_score=max(0.0, min(1.0, mastery_score)),
                card_count=card_count,
                avg_ease_factor=float(avg_ease_factor) if avg_ease_factor else 2.5,
            )
        )

    return topics


@router.get("/today", response_model=TodayStats)
async def get_today_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get today's study statistics from the Learning Ledger.

    This endpoint provides real-time today's metrics:
    - Total study time in minutes
    - Number of learning events
    - Reviews completed
    - Average accuracy
    """
    from sqlalchemy import func
    from datetime import datetime, timedelta

    # Get start of today (UTC)
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    # Query Learning Ledger for today's events
    today_query = select(
        func.coalesce(func.sum(ActivityLog.duration_seconds), 0).label("total_seconds"),
        func.count(ActivityLog.id).label("event_count"),
        func.coalesce(func.avg(ActivityLog.accuracy), 0.0).label("avg_accuracy"),
    ).where(
        and_(
            ActivityLog.user_id == current_user.id,
            ActivityLog.is_learning_event == True,  # noqa: E712 - SQLAlchemy requires this
            ActivityLog.created_at >= today_start,
        )
    )

    result = await db.execute(today_query)
    row = result.one()

    total_seconds = row.total_seconds or 0
    event_count = row.event_count or 0
    avg_accuracy = float(row.avg_accuracy) if row.avg_accuracy else 0.0

    logger.info(
        "today_stats",
        user_id=current_user.id,
        study_time_minutes=total_seconds // 60,
        learning_events=event_count,
    )

    return TodayStats(
        study_time_minutes=total_seconds // 60,
        learning_events=event_count,
        reviews_completed=event_count,  # For now, all learning events are reviews
        average_accuracy=avg_accuracy,
        data_source="learning_ledger" if settings.ENABLE_LEARNING_LEDGER else "legacy",
    )


@router.get("/forecast", response_model=ReviewForecast)
async def get_forecast(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get review forecast for planning.

    Returns counts of reviews due:
    - Today
    - Tomorrow
    - This week (next 7 days)
    - Overdue (past due)
    """
    from datetime import datetime, timedelta
    from app.models.deck import Deck

    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow_start = today_start + timedelta(days=1)
    tomorrow_end = today_start + timedelta(days=2)
    week_end = today_start + timedelta(days=7)

    # Base query: join Flashcard with Deck to filter by user
    # Flashcard -> deck_id -> Deck -> user_id
    base_join = (
        select(func.count(Flashcard.id))
        .join(Deck, Flashcard.deck_id == Deck.id)
        .where(
            and_(
                Deck.user_id == current_user.id,
                Flashcard.deleted_at.is_(None),  # Exclude deleted cards
            )
        )
    )

    # Count overdue (next_review < today_start, excluding NULL)
    overdue_count = await db.scalar(base_join.where(Flashcard.next_review < today_start))

    # Count due today: NULL (new cards) + scheduled for today
    today_count = await db.scalar(
        base_join.where(
            or_(
                Flashcard.next_review.is_(None),  # New cards
                and_(
                    Flashcard.next_review >= today_start,
                    Flashcard.next_review < tomorrow_start,
                ),
            )
        )
    )

    # Count due tomorrow (only scheduled cards)
    tomorrow_count = await db.scalar(
        base_join.where(
            and_(
                Flashcard.next_review >= tomorrow_start,
                Flashcard.next_review < tomorrow_end,
            )
        )
    )

    # Count due this week: NULL + scheduled in next 7 days
    week_count = await db.scalar(
        base_join.where(
            or_(
                Flashcard.next_review.is_(None),  # New cards
                and_(
                    Flashcard.next_review >= today_start,
                    Flashcard.next_review < week_end,
                ),
            )
        )
    )

    return ReviewForecast(
        due_today=today_count or 0,
        due_tomorrow=tomorrow_count or 0,
        due_this_week=week_count or 0,
        overdue=overdue_count or 0,
    )


# Session boundary constant (in minutes)
SESSION_WINDOW_MINUTES = 45


@router.get("/last-session", response_model=LastSessionStats)
async def get_last_session(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get last study session quality feedback.

    Session boundary rule (explicit, not magic):
    - Find the most recent learning event
    - Include all events within SESSION_WINDOW_MINUTES (45) before it
    - This forms the "last session"

    Quality labels:
    - 90%+ accuracy → "Strong recall"
    - 70-89% → "Good practice"
    - <70% → "Needs review"
    """
    from datetime import datetime, timedelta

    # Find last learning event
    last_event_query = (
        select(ActivityLog.created_at)
        .where(
            and_(
                ActivityLog.user_id == current_user.id,
                ActivityLog.is_learning_event == True,  # noqa: E712
            )
        )
        .order_by(ActivityLog.created_at.desc())
        .limit(1)
    )

    result = await db.execute(last_event_query)
    last_event_time = result.scalar()

    if not last_event_time:
        return LastSessionStats(
            cards_reviewed=0,
            duration_minutes=0,
            accuracy_percent=0.0,
            quality_label="No sessions yet",
            ended_at=None,
            has_session=False,
        )

    # Get all events within session window
    session_start = last_event_time - timedelta(minutes=SESSION_WINDOW_MINUTES)

    session_query = select(
        func.count(ActivityLog.id).label("card_count"),
        func.coalesce(func.sum(ActivityLog.duration_seconds), 0).label("total_seconds"),
        func.coalesce(func.avg(ActivityLog.accuracy), 0.0).label("avg_accuracy"),
    ).where(
        and_(
            ActivityLog.user_id == current_user.id,
            ActivityLog.is_learning_event == True,  # noqa: E712
            ActivityLog.created_at >= session_start,
            ActivityLog.created_at <= last_event_time,
        )
    )

    result = await db.execute(session_query)
    row = result.one()

    card_count = row.card_count or 0
    total_seconds = row.total_seconds or 0
    avg_accuracy = float(row.avg_accuracy) if row.avg_accuracy else 0.0
    accuracy_percent = avg_accuracy * 100

    # Determine quality label
    if accuracy_percent >= 90:
        quality_label = "Strong recall"
    elif accuracy_percent >= 70:
        quality_label = "Good practice"
    elif card_count > 0:
        quality_label = "Needs review"
    else:
        quality_label = "No sessions yet"

    return LastSessionStats(
        cards_reviewed=card_count,
        duration_minutes=total_seconds // 60,
        accuracy_percent=round(accuracy_percent, 1),
        quality_label=quality_label,
        ended_at=last_event_time.isoformat() if last_event_time else None,
        has_session=card_count > 0,
    )


@router.post("/export")
async def export_analytics(
    format: str = Query("csv", regex="^(csv|json)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Export analytics data.
    """
    return {"message": "Export functionality to be implemented", "format": format}
