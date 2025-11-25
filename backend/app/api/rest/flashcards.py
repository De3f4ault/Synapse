"""
Flashcard REST API endpoints.

Individual flashcard operations including review functionality.
Uses service layer for business logic - SM-2 algorithm executed via SQL function.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.flashcard import Flashcard, LearningState
from app.models.deck import Deck
from app.modules.flashcards.service import FlashcardService

router = APIRouter()


# ============================================================================
# Request/Response Schemas
# ============================================================================

class FlashcardCreate(BaseModel):
    """Flashcard creation request."""
    deck_id: int
    front_text: str = Field(..., min_length=1)
    back_text: str = Field(..., min_length=1)
    front_media_url: Optional[str] = None
    back_media_url: Optional[str] = None


class FlashcardUpdate(BaseModel):
    """Flashcard update request."""
    front_text: Optional[str] = Field(None, min_length=1)
    back_text: Optional[str] = Field(None, min_length=1)
    front_media_url: Optional[str] = None
    back_media_url: Optional[str] = None


class ReviewSubmit(BaseModel):
    """Review submission request."""
    quality: int = Field(..., ge=0, le=5, description="Quality rating 0-5")
    time_taken_ms: int = Field(..., ge=0, description="Time taken in milliseconds")


class FlashcardResponse(BaseModel):
    """Flashcard response."""
    id: int
    deck_id: int
    front_text: str
    back_text: str
    front_media_url: Optional[str]
    back_media_url: Optional[str]
    ease_factor: Decimal
    interval: int
    repetitions: int
    next_review: Optional[datetime]
    learning_state: LearningState
    times_reviewed: int
    accuracy: float
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewResult(BaseModel):
    """Review result response."""
    next_review_date: datetime
    new_interval: int
    new_ease_factor: Decimal
    success: bool
    message: str


class MessageResponse(BaseModel):
    """Simple message response."""
    message: str


# ============================================================================
# Endpoints
# ============================================================================

@router.post(
    "",
    response_model=FlashcardResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create flashcard",
    description="Create a new flashcard in a deck"
)
async def create_card(
    card_data: FlashcardCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new flashcard using service layer."""
    service = FlashcardService(db)

    try:
        result = await service.create_card(
            user_id=current_user.id,
            data={
                "deck_id": card_data.deck_id,
                "front_text": card_data.front_text,
                "back_text": card_data.back_text,
                "front_media_url": card_data.front_media_url,
                "back_media_url": card_data.back_media_url,
            }
        )
        await db.commit()
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get(
    "/due",
    response_model=List[FlashcardResponse],
    summary="Get due cards",
    description="Retrieve cards due for review"
)
async def get_due_cards(
    deck_id: Optional[int] = Query(None, description="Filter by deck"),
    limit: int = Query(20, ge=1, le=100, description="Maximum cards to return"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get cards due for review using service layer."""
    service = FlashcardService(db)

    cards = await service.get_due_cards(
        user_id=current_user.id,
        deck_id=deck_id,
        limit=limit
    )

    return cards


@router.post(
    "/{card_id}/review",
    response_model=ReviewResult,
    summary="Review card",
    description="Submit a review for a flashcard (SM-2 algorithm via SQL)"
)
async def review_card(
    card_id: int,
    review_data: ReviewSubmit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Review a flashcard.

    Uses service layer which calls repository -> SQL function calculate_sm2().
    No Python SM-2 logic here - single source of truth in PostgreSQL.
    """
    service = FlashcardService(db)

    try:
        result = await service.review_card(
            card_id=card_id,
            user_id=current_user.id,
            quality=review_data.quality
        )

        return ReviewResult(
            next_review_date=result["next_review_date"],
            new_interval=result["new_interval"],
            new_ease_factor=Decimal(str(result["new_ease_factor"])),
            success=True,
            message="Review recorded successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get(
    "/{card_id}",
    response_model=FlashcardResponse,
    summary="Get flashcard",
    description="Retrieve a specific flashcard"
)
async def get_card(
    card_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific flashcard using service layer."""
    service = FlashcardService(db)

    try:
        result = await service.get_card(card_id=card_id, user_id=current_user.id)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.delete(
    "/{card_id}",
    response_model=MessageResponse,
    summary="Delete flashcard",
    description="Delete a flashcard (soft delete)"
)
async def delete_card(
    card_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a flashcard (soft delete)."""
    result = await db.execute(
        select(Flashcard).join(Deck).where(
            and_(
                Flashcard.id == card_id,
                Deck.user_id == current_user.id,
                Flashcard.deleted_at.is_(None)
            )
        )
    )
    card = result.scalar_one_or_none()

    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found"
        )

    card.deleted_at = datetime.utcnow()
    await db.commit()

    return MessageResponse(message="Card deleted successfully")
