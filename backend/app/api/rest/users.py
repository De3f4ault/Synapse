"""
User management REST API endpoints.

Profile management, preferences, and comprehensive user statistics.
"""

from typing import Optional, Dict
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr, Field
from app.schemas.common import MessageResponse
import logging

from app.api.deps import get_db, get_current_user
from app.models.user import User

# Extracted statistics queries
from app.services.user_stats_service import (
    count_flashcards,
    count_decks,
    count_notes,
    count_documents,
    calculate_study_streak,
    count_reviews_today,
    count_total_reviews,
    calculate_accuracy,
    calculate_study_time,
    count_study_sessions,
)

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
    """User statistics response."""
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
        total_cards, due_cards = await count_flashcards(current_user.id, db)
        total_decks = await count_decks(current_user.id, db)
        total_notes = await count_notes(current_user.id, db)
        total_documents = await count_documents(current_user.id, db)
        study_streak = await calculate_study_streak(current_user.id, db)
        reviews_today = await count_reviews_today(current_user.id, db)
        total_reviews = await count_total_reviews(current_user.id, db)
        accuracy = await calculate_accuracy(current_user.id, db)
        study_time = await calculate_study_time(current_user.id, db)
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
