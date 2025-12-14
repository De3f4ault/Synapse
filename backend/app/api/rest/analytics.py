"""
Analytics REST API endpoints.

Learning analytics, progress tracking, and performance insights with SQL aggregations.
"""

from typing import List, Dict, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, case, Float
from pydantic import BaseModel

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.flashcard import Flashcard, LearningState
from app.models.deck import Deck
from app.models.review import Review
from app.models.note import Note
from app.models.document import Document
from app.models.study_session import StudySession

router = APIRouter()


# ============================================================================
# Schemas
# ============================================================================

class DashboardOverview(BaseModel):
    """Dashboard overview statistics."""
    total_cards: int
    due_cards: int
    cards_reviewed_today: int
    total_decks: int
    total_notes: int
    total_documents: int
    study_streak_days: int
    overall_accuracy: float
    total_study_time_minutes: int


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


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/overview", response_model=DashboardOverview)
async def get_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get dashboard overview with key metrics."""

    # Total cards
    total_cards_result = await db.execute(
        select(func.count(Flashcard.id)).join(Deck).where(
            and_(
                Deck.user_id == current_user.id,
                Flashcard.deleted_at.is_(None),
                Deck.deleted_at.is_(None)
            )
        )
    )
    total_cards = total_cards_result.scalar() or 0

    # Due cards
    due_cards_result = await db.execute(
        select(func.count(Flashcard.id)).join(Deck).where(
            and_(
                Deck.user_id == current_user.id,
                Flashcard.deleted_at.is_(None),
                Deck.deleted_at.is_(None),
                Flashcard.next_review <= datetime.utcnow()
            )
        )
    )
    due_cards = due_cards_result.scalar() or 0

    # Cards reviewed today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    reviews_today_result = await db.execute(
        select(func.count(Review.id)).where(
            and_(
                Review.user_id == current_user.id,
                Review.reviewed_at >= today_start
            )
        )
    )
    cards_reviewed_today = reviews_today_result.scalar() or 0

    # Total decks
    total_decks_result = await db.execute(
        select(func.count(Deck.id)).where(
            and_(
                Deck.user_id == current_user.id,
                Deck.deleted_at.is_(None)
            )
        )
    )
    total_decks = total_decks_result.scalar() or 0

    # Total notes
    total_notes_result = await db.execute(
        select(func.count(Note.id)).where(
            and_(
                Note.user_id == current_user.id,
                Note.deleted_at.is_(None)
            )
        )
    )
    total_notes = total_notes_result.scalar() or 0

    # Total documents
    total_docs_result = await db.execute(
        select(func.count(Document.id)).where(
            and_(
                Document.user_id == current_user.id,
                Document.deleted_at.is_(None)
            )
        )
    )
    total_documents = total_docs_result.scalar() or 0

    # Study streak (consecutive days with reviews)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    streak_result = await db.execute(
        select(func.count(func.distinct(func.date(Review.reviewed_at)))).where(
            and_(
                Review.user_id == current_user.id,
                Review.reviewed_at >= thirty_days_ago
            )
        )
    )
    study_streak = streak_result.scalar() or 0

    # Overall accuracy (fixed with CASE WHEN)
    accuracy_result = await db.execute(
        select(
            func.avg(
                case(
                    (Review.quality >= 3, 1),
                    else_=0
                )
            )
        ).where(Review.user_id == current_user.id)
    )
    overall_accuracy = accuracy_result.scalar() or 0.0

    # Total study time from sessions
    study_time_result = await db.execute(
        select(func.sum(StudySession.time_spent_seconds)).where(
            StudySession.user_id == current_user.id
        )
    )
    total_study_seconds = study_time_result.scalar() or 0
    total_study_minutes = total_study_seconds // 60

    return DashboardOverview(
        total_cards=total_cards,
        due_cards=due_cards,
        cards_reviewed_today=cards_reviewed_today,
        total_decks=total_decks,
        total_notes=total_notes,
        total_documents=total_documents,
        study_streak_days=study_streak,
        overall_accuracy=float(overall_accuracy),
        total_study_time_minutes=total_study_minutes
    )


@router.get("/weak-areas", response_model=List[WeakArea])
async def get_weak_areas(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Identify weak areas based on review performance.
    """
    weak_areas_query = select(
        Deck.name,
        func.count(Review.id).label('review_count'),
        func.avg(
            case(
                (Review.quality >= 3, 1),
                else_=0
            )
        ).label('accuracy')
    ).join(
        Flashcard, Flashcard.deck_id == Deck.id
    ).join(
        Review, Review.card_id == Flashcard.id
    ).where(
        Deck.user_id == current_user.id
    ).group_by(
        Deck.id, Deck.name
    ).having(
        func.avg(
            case(
                (Review.quality >= 3, 1),
                else_=0
            )
        ) < 0.7
    ).order_by(
        func.avg(
            case(
                (Review.quality >= 3, 1),
                else_=0
            )
        ).asc()
    ).limit(limit)

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

        weak_areas.append(WeakArea(
            topic=name,
            accuracy=float(accuracy),
            review_count=review_count,
            severity=severity
        ))

    return weak_areas


@router.get("/performance", response_model=List[PerformanceTrend])
async def get_performance(
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get performance trends over time."""
    start_date = datetime.utcnow() - timedelta(days=days)

    performance_query = select(
        func.date(Review.reviewed_at).label('date'),
        func.count(Review.id).label('reviews_count'),
        func.avg(
            case(
                (Review.quality >= 3, 1),
                else_=0
            )
        ).label('accuracy')
    ).where(
        and_(
            Review.user_id == current_user.id,
            Review.reviewed_at >= start_date
        )
    ).group_by(
        func.date(Review.reviewed_at)
    ).order_by(
        func.date(Review.reviewed_at).asc()
    )

    result = await db.execute(performance_query)
    rows = result.all()

    study_time_query = select(
        func.date(StudySession.started_at).label('date'),
        func.sum(StudySession.time_spent_seconds).label('total_seconds')
    ).where(
        and_(
            StudySession.user_id == current_user.id,
            StudySession.started_at >= start_date
        )
    ).group_by(
        func.date(StudySession.started_at)
    )

    study_time_result = await db.execute(study_time_query)
    study_time_by_date = {
        date: total_seconds // 60
        for date, total_seconds in study_time_result.all()
    }

    trends = []
    for date, reviews_count, accuracy in rows:
        date_str = date.isoformat() if hasattr(date, 'isoformat') else str(date)
        study_time = study_time_by_date.get(date, 0)

        trends.append(PerformanceTrend(
            date=date_str,
            reviews_count=reviews_count,
            accuracy=float(accuracy) if accuracy else 0.0,
            study_time_minutes=study_time
        ))

    return trends


@router.get("/heatmap", response_model=List[HeatmapData])
async def get_heatmap(
    days: int = Query(365, ge=1, le=730, description="Number of days"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get activity heatmap data (for visualization)."""
    start_date = datetime.utcnow() - timedelta(days=days)

    heatmap_query = select(
        func.date(Review.reviewed_at).label('date'),
        func.count(Review.id).label('activity_count')
    ).where(
        and_(
            Review.user_id == current_user.id,
            Review.reviewed_at >= start_date
        )
    ).group_by(
        func.date(Review.reviewed_at)
    ).order_by(
        func.date(Review.reviewed_at).asc()
    )

    result = await db.execute(heatmap_query)
    rows = result.all()

    return [
        HeatmapData(
            date=date.isoformat() if hasattr(date, 'isoformat') else str(date),
            activity_count=activity_count
        )
        for date, activity_count in rows
    ]


@router.get("/topics", response_model=List[TopicMastery])
async def get_topic_mastery(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get mastery levels per topic/deck.
    """
    mastery_query = select(
        Deck.name,
        func.count(Flashcard.id).label('card_count'),
        func.avg(Flashcard.ease_factor).label('avg_ease_factor'),
        func.avg(
            func.cast(Flashcard.times_correct, Float) /
            func.nullif(Flashcard.times_reviewed, 0)
        ).label('success_rate')
    ).join(
        Flashcard, Flashcard.deck_id == Deck.id
    ).where(
        and_(
            Deck.user_id == current_user.id,
            Deck.deleted_at.is_(None),
            Flashcard.deleted_at.is_(None),
            Flashcard.times_reviewed > 0
        )
    ).group_by(
        Deck.id, Deck.name
    ).order_by(
        func.avg(Flashcard.ease_factor).desc()
    )

    result = await db.execute(mastery_query)
    rows = result.all()

    topics = []
    for name, card_count, avg_ease_factor, success_rate in rows:
        ease_normalized = (float(avg_ease_factor) - 1.3) / (5.0 - 1.3) if avg_ease_factor else 0.5
        success = float(success_rate) if success_rate else 0.0
        mastery_score = (ease_normalized * 0.5) + (success * 0.5)

        topics.append(TopicMastery(
            topic=name,
            mastery_score=max(0.0, min(1.0, mastery_score)),
            card_count=card_count,
            avg_ease_factor=float(avg_ease_factor) if avg_ease_factor else 2.5
        ))

    return topics


@router.post("/export")
async def export_analytics(
    format: str = Query("csv", regex="^(csv|json)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Export analytics data.
    """
    return {
        "message": "Export functionality to be implemented",
        "format": format
    }
