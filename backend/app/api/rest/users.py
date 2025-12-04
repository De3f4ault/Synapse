"""
User management REST API endpoints.

Profile management, preferences, and comprehensive user statistics.
Complete implementation with real dashboard data queries.
"""

from typing import Optional, Dict
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from pydantic import BaseModel, EmailStr, Field
import logging

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.flashcard import Flashcard, LearningState
from app.models.deck import Deck
from app.models.review import Review
from app.models.note import Note
from app.models.document import Document
from app.models.study_session import StudySession

logger = logging.getLogger(__name__)
router = APIRouter()


# ============================================================================
# Request/Response Schemas
# ============================================================================

class UserUpdate(BaseModel):
    """User profile update request."""
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    timezone: Optional[str] = Field(None, max_length=50)
    preferences: Optional[Dict] = None


class PasswordChange(BaseModel):
    """Password change request."""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, description="New password")


class UserStatistics(BaseModel):
    """User statistics response - comprehensive learning metrics."""
    # Content metrics
    total_cards: int = 0
    due_cards: int = 0
    total_decks: int = 0
    total_notes: int = 0
    total_documents: int = 0

    # Learning metrics
    study_streak_days: int = 0
    reviews_today: int = 0
    total_reviews: int = 0
    overall_accuracy: float = 0.0

    # Engagement metrics
    total_study_time_minutes: int = 0
    study_sessions_count: int = 0


class MessageResponse(BaseModel):
    """Simple message response."""
    message: str


# ============================================================================
# Helper Functions - Statistics Queries
# ============================================================================

async def count_user_flashcards(user_id: int, db: AsyncSession) -> tuple[int, int]:
    """
    Count total and due flashcards for user.

    Returns:
        (total_cards, due_cards)
    """
    try:
        # Total cards
        total_query = select(func.count(Flashcard.id)).select_from(
            Flashcard
        ).join(Deck).where(
            and_(
                Deck.user_id == user_id,
                Flashcard.deleted_at.is_(None),
                Deck.deleted_at.is_(None)
            )
        )
        total_result = await db.execute(total_query)
        total_cards = total_result.scalar() or 0

        # Due cards (overdue or today)
        due_query = select(func.count(Flashcard.id)).select_from(
            Flashcard
        ).join(Deck).where(
            and_(
                Deck.user_id == user_id,
                Flashcard.deleted_at.is_(None),
                Deck.deleted_at.is_(None),
                Flashcard.next_review <= datetime.utcnow()
            )
        )
        due_result = await db.execute(due_query)
        due_cards = due_result.scalar() or 0

        return total_cards, due_cards

    except Exception as e:
        logger.error(f"Error counting flashcards: {str(e)}")
        return 0, 0


async def count_user_decks(user_id: int, db: AsyncSession) -> int:
    """Count total decks for user."""
    try:
        query = select(func.count(Deck.id)).where(
            and_(
                Deck.user_id == user_id,
                Deck.deleted_at.is_(None)
            )
        )
        result = await db.execute(query)
        return result.scalar() or 0
    except Exception as e:
        logger.error(f"Error counting decks: {str(e)}")
        return 0


async def count_user_notes(user_id: int, db: AsyncSession) -> int:
    """Count total notes for user."""
    try:
        query = select(func.count(Note.id)).where(
            and_(
                Note.user_id == user_id,
                Note.deleted_at.is_(None)
            )
        )
        result = await db.execute(query)
        return result.scalar() or 0
    except Exception as e:
        logger.error(f"Error counting notes: {str(e)}")
        return 0


async def count_user_documents(user_id: int, db: AsyncSession) -> int:
    """Count total documents for user."""
    try:
        query = select(func.count(Document.id)).where(
            and_(
                Document.user_id == user_id,
                Document.deleted_at.is_(None)
            )
        )
        result = await db.execute(query)
        return result.scalar() or 0
    except Exception as e:
        logger.error(f"Error counting documents: {str(e)}")
        return 0


async def calculate_study_streak(user_id: int, db: AsyncSession) -> int:
    """
    Calculate consecutive days with reviews (study streak).

    Returns:
        Number of consecutive days with activity
    """
    try:
        # Get reviews for last 30 days
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)

        query = select(
            func.date(Review.created_at).label('review_date')
        ).where(
            and_(
                Review.user_id == user_id,
                Review.created_at >= thirty_days_ago
            )
        ).group_by(func.date(Review.created_at)).order_by(
            func.date(Review.created_at).desc()
        )

        result = await db.execute(query)
        review_dates = [row[0] for row in result.all()]

        if not review_dates:
            return 0

        # Calculate consecutive streak from most recent date
        streak = 0
        current_date = datetime.utcnow().date()

        for i in range(30):
            check_date = current_date - timedelta(days=i)
            if check_date in review_dates:
                streak += 1
            else:
                break

        return streak

    except Exception as e:
        logger.error(f"Error calculating study streak: {str(e)}")
        return 0


async def count_reviews_today(user_id: int, db: AsyncSession) -> int:
    """Count reviews completed today."""
    try:
        today = datetime.utcnow().date()

        query = select(func.count(Review.id)).where(
            and_(
                Review.user_id == user_id,
                func.date(Review.created_at) == today
            )
        )
        result = await db.execute(query)
        return result.scalar() or 0
    except Exception as e:
        logger.error(f"Error counting reviews today: {str(e)}")
        return 0


async def count_total_reviews(user_id: int, db: AsyncSession) -> int:
    """Count total reviews for user."""
    try:
        query = select(func.count(Review.id)).where(
            Review.user_id == user_id
        )
        result = await db.execute(query)
        return result.scalar() or 0
    except Exception as e:
        logger.error(f"Error counting total reviews: {str(e)}")
        return 0


async def calculate_overall_accuracy(user_id: int, db: AsyncSession) -> float:
    """
    Calculate overall accuracy from reviews.

    Returns:
        Percentage (0.0 - 100.0)
    """
    try:
        # Query reviews with quality scores
        # Quality >= 3 means the user got it right (SM-2 algorithm)
        query = select(
            func.count(Review.id).label('total'),
            func.sum(
                func.cast(Review.quality >= 3, type_=int)
            ).label('correct')
        ).where(Review.user_id == user_id)

        result = await db.execute(query)
        row = result.first()

        if not row or row[0] == 0:
            return 0.0

        total = row[0]
        correct = row[1] or 0

        return (correct / total) * 100.0

    except Exception as e:
        logger.error(f"Error calculating accuracy: {str(e)}")
        return 0.0


async def calculate_total_study_time(user_id: int, db: AsyncSession) -> int:
    """
    Calculate total study time in minutes.

    Returns:
        Total minutes of study
    """
    try:
        query = select(
            func.sum(StudySession.time_spent_seconds)
        ).where(
            and_(
                StudySession.user_id == user_id,
                StudySession.ended_at.isnot(None)
            )
        )
        result = await db.execute(query)
        total_seconds = result.scalar() or 0

        return int(total_seconds / 60)
    except Exception as e:
        logger.error(f"Error calculating study time: {str(e)}")
        return 0


async def count_study_sessions(user_id: int, db: AsyncSession) -> int:
    """Count completed study sessions."""
    try:
        query = select(func.count(StudySession.id)).where(
            and_(
                StudySession.user_id == user_id,
                StudySession.ended_at.isnot(None)
            )
        )
        result = await db.execute(query)
        return result.scalar() or 0
    except Exception as e:
        logger.error(f"Error counting study sessions: {str(e)}")
        return 0


# ============================================================================
# Endpoints
# ============================================================================

@router.get(
    "/me",
    summary="Get user profile",
    description="Retrieve authenticated user's profile"
)
async def get_profile(
    current_user: User = Depends(get_current_user)
):
    """Get current user's profile."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_active": current_user.is_active,
        "is_admin": current_user.is_admin,
        "email_verified": current_user.email_verified,
        "timezone": current_user.timezone,
        "preferences": current_user.preferences,
        "created_at": current_user.created_at,
        "last_login": current_user.last_login
    }


@router.put(
    "/me",
    summary="Update user profile",
    description="Update authenticated user's profile information"
)
async def update_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update user profile."""
    # Update fields if provided
    if update_data.full_name is not None:
        current_user.full_name = update_data.full_name

    if update_data.timezone is not None:
        current_user.timezone = update_data.timezone

    if update_data.preferences is not None:
        current_user.preferences = update_data.preferences

    await db.commit()
    await db.refresh(current_user)

    logger.info(f"User profile updated: {current_user.id}")

    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "timezone": current_user.timezone,
        "preferences": current_user.preferences
    }


@router.put(
    "/me/password",
    response_model=MessageResponse,
    summary="Change password",
    description="Change authenticated user's password"
)
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Change user password."""
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    # Verify current password
    if not pwd_context.verify(password_data.current_password, current_user.password_hash):
        logger.warning(f"Failed password change attempt for user {current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )

    # Update password
    current_user.password_hash = pwd_context.hash(password_data.new_password)
    await db.commit()

    logger.info(f"Password changed for user {current_user.id}")

    return MessageResponse(message="Password changed successfully")


@router.delete(
    "/me",
    response_model=MessageResponse,
    summary="Delete account",
    description="Delete authenticated user's account (soft delete)"
)
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete user account (soft delete).

    Sets is_active to False. Data is preserved for potential recovery.
    """
    current_user.is_active = False
    await db.commit()

    logger.info(f"Account deleted (soft) for user {current_user.id}")

    return MessageResponse(message="Account deleted successfully")


@router.get(
    "/me/statistics",
    response_model=UserStatistics,
    summary="Get user statistics",
    description="Retrieve comprehensive learning statistics"
)
async def get_statistics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get comprehensive user learning statistics.

    Returns counts, metrics, and engagement data across all modules.
    """
    try:
        # Fetch all statistics concurrently (could be optimized with asyncio.gather)
        total_cards, due_cards = await count_user_flashcards(current_user.id, db)
        total_decks = await count_user_decks(current_user.id, db)
        total_notes = await count_user_notes(current_user.id, db)
        total_documents = await count_user_documents(current_user.id, db)
        study_streak = await calculate_study_streak(current_user.id, db)
        reviews_today = await count_reviews_today(current_user.id, db)
        total_reviews = await count_total_reviews(current_user.id, db)
        accuracy = await calculate_overall_accuracy(current_user.id, db)
        study_time = await calculate_total_study_time(current_user.id, db)
        sessions = await count_study_sessions(current_user.id, db)

        logger.info(
            "user_statistics_retrieved",
            user_id=current_user.id,
            total_cards=total_cards,
            total_reviews=total_reviews,
            study_streak=study_streak
        )

        return UserStatistics(
            total_cards=total_cards,
            due_cards=due_cards,
            total_decks=total_decks,
            total_notes=total_notes,
            total_documents=total_documents,
            study_streak_days=study_streak,
            reviews_today=reviews_today,
            total_reviews=total_reviews,
            overall_accuracy=accuracy,
            total_study_time_minutes=study_time,
            study_sessions_count=sessions
        )

    except Exception as e:
        logger.error(f"Error retrieving user statistics: {str(e)}", exc_info=True)
        # Return empty statistics on error instead of failing
        return UserStatistics()
