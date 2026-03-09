"""
User statistics service.

Extracted from rest/users.py — centralizes dashboard metrics queries.
All functions take (user_id, db) and return a single metric.
"""

from datetime import datetime, timedelta

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.flashcard import Flashcard
from app.models.deck import Deck
from app.models.review import Review
from app.models.note import Note
from app.models.document import Document
from app.models.study_session import StudySession
from app.utils.logging import get_logger

logger = get_logger(__name__)


async def count_flashcards(user_id: int, db: AsyncSession) -> tuple[int, int]:
    """Count total and due flashcards. Returns (total, due)."""
    try:
        total_q = (
            select(func.count(Flashcard.id))
            .select_from(Flashcard)
            .join(Deck)
            .where(and_(Deck.user_id == user_id, Flashcard.deleted_at.is_(None), Deck.deleted_at.is_(None)))
        )
        due_q = total_q.where(Flashcard.next_review <= datetime.utcnow())

        total = (await db.execute(total_q)).scalar() or 0
        due = (await db.execute(due_q)).scalar() or 0
        return total, due
    except Exception as e:
        logger.error("count_flashcards_failed", error=str(e))
        return 0, 0


async def count_decks(user_id: int, db: AsyncSession) -> int:
    """Count active decks."""
    try:
        q = select(func.count(Deck.id)).where(and_(Deck.user_id == user_id, Deck.deleted_at.is_(None)))
        return (await db.execute(q)).scalar() or 0
    except Exception:
        return 0


async def count_notes(user_id: int, db: AsyncSession) -> int:
    """Count active notes."""
    try:
        q = select(func.count(Note.id)).where(and_(Note.user_id == user_id, Note.deleted_at.is_(None)))
        return (await db.execute(q)).scalar() or 0
    except Exception:
        return 0


async def count_documents(user_id: int, db: AsyncSession) -> int:
    """Count active documents."""
    try:
        q = select(func.count(Document.id)).where(and_(Document.user_id == user_id, Document.deleted_at.is_(None)))
        return (await db.execute(q)).scalar() or 0
    except Exception:
        return 0


async def calculate_study_streak(user_id: int, db: AsyncSession) -> int:
    """Calculate consecutive days with reviews (last 30 days)."""
    try:
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        q = (
            select(func.date(Review.created_at).label("review_date"))
            .where(and_(Review.user_id == user_id, Review.created_at >= thirty_days_ago))
            .group_by(func.date(Review.created_at))
            .order_by(func.date(Review.created_at).desc())
        )
        dates = [row[0] for row in (await db.execute(q)).all()]
        if not dates:
            return 0

        streak, today = 0, datetime.utcnow().date()
        for i in range(30):
            if (today - timedelta(days=i)) in dates:
                streak += 1
            else:
                break
        return streak
    except Exception:
        return 0


async def count_reviews_today(user_id: int, db: AsyncSession) -> int:
    """Count reviews completed today."""
    try:
        q = select(func.count(Review.id)).where(
            and_(Review.user_id == user_id, func.date(Review.created_at) == datetime.utcnow().date())
        )
        return (await db.execute(q)).scalar() or 0
    except Exception:
        return 0


async def count_total_reviews(user_id: int, db: AsyncSession) -> int:
    """Count lifetime reviews."""
    try:
        q = select(func.count(Review.id)).where(Review.user_id == user_id)
        return (await db.execute(q)).scalar() or 0
    except Exception:
        return 0


async def calculate_accuracy(user_id: int, db: AsyncSession) -> float:
    """Calculate overall accuracy percentage (0.0 – 100.0)."""
    try:
        q = select(
            func.count(Review.id).label("total"),
            func.sum(func.cast(Review.quality >= 3, type_=int)).label("correct"),
        ).where(Review.user_id == user_id)
        row = (await db.execute(q)).first()
        if not row or row[0] == 0:
            return 0.0
        return ((row[1] or 0) / row[0]) * 100.0
    except Exception:
        return 0.0


async def calculate_study_time(user_id: int, db: AsyncSession) -> int:
    """Calculate total study time in minutes."""
    try:
        q = select(func.sum(StudySession.time_spent_seconds)).where(
            and_(StudySession.user_id == user_id, StudySession.ended_at.isnot(None))
        )
        total_seconds = (await db.execute(q)).scalar() or 0
        return int(total_seconds / 60)
    except Exception:
        return 0


async def count_study_sessions(user_id: int, db: AsyncSession) -> int:
    """Count completed study sessions."""
    try:
        q = select(func.count(StudySession.id)).where(
            and_(StudySession.user_id == user_id, StudySession.ended_at.isnot(None))
        )
        return (await db.execute(q)).scalar() or 0
    except Exception:
        return 0
