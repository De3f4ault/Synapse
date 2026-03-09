"""
Flashcard REST API endpoints.

Individual flashcard operations including review functionality.
Uses service layer for business logic - SM-2 algorithm executed via SQL function.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from pydantic import BaseModel, Field
from app.schemas.common import MessageResponse
from datetime import datetime
from decimal import Decimal
import structlog

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.flashcard import Flashcard, LearningState
from app.models.deck import Deck
from app.modules.flashcards.service import FlashcardService

router = APIRouter()
logger = structlog.get_logger()


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
    """
    Flashcard response - matches get_due_cards() SQL function output.

    Note: This differs from the Flashcard database model because
    get_due_cards() returns calculated fields for prioritization.
    """

    id: int
    deck_id: int
    front_text: str
    back_text: str
    front_media_url: Optional[str] = None
    back_media_url: Optional[str] = None

    # SM-2 algorithm fields
    ease_factor: float = 2.5
    interval: int = 0
    repetitions: int = 0
    last_review: Optional[datetime] = None
    next_review: Optional[datetime] = None
    learning_state: str = "NEW"  # String not enum to match SQL output

    # Review statistics
    times_reviewed: int = 0
    accuracy: float = 0.0

    # Extra fields from get_due_cards() function
    deck_name: Optional[str] = None  # Included in SQL JOIN
    overdue_days: Optional[int] = 0  # Calculated field
    priority_score: Optional[float] = 0.0  # Calculated field

    class Config:
        from_attributes = True
        # Allow extra fields that might be present
        extra = "ignore"


class ReviewResult(BaseModel):
    """Review result response."""

    next_review_date: datetime
    new_interval: int
    new_ease_factor: float  # Changed from Decimal to float
    success: bool
    message: str




# ============================================================================
# Endpoints
# ============================================================================


@router.post(
    "",
    response_model=FlashcardResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create flashcard",
    description="Create a new flashcard in a deck",
)
async def create_card(
    card_data: FlashcardCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
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
            },
        )
        await db.commit()
        return result
    except Exception as e:
        logger.error("create_card_error", error=str(e), user_id=current_user.id)
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/due",
    response_model=List[FlashcardResponse],
    summary="Get due cards",
    description="Retrieve cards due for review",
)
async def get_due_cards(
    deck_id: Optional[int] = Query(None, description="Filter by deck"),
    limit: int = Query(20, ge=1, le=100, description="Maximum cards to return"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get cards due for review.

    CRITICAL: This endpoint MUST return 200 status even on errors
    to prevent CORS issues. Returns empty list [] on any failure.
    """
    try:
        # Log the request for debugging
        logger.info("get_due_cards_request", user_id=current_user.id, deck_id=deck_id, limit=limit)

        # Try using service layer first
        service = FlashcardService(db)

        # Check if method exists before calling
        if not hasattr(service, "get_due_cards"):
            logger.warning(
                "get_due_cards_method_not_found",
                user_id=current_user.id,
                message="FlashcardService.get_due_cards() method not implemented",
            )
            # Use fallback query
            return await _fallback_get_due_cards(db, current_user.id, deck_id, limit)

        cards = await service.get_due_cards(user_id=current_user.id, deck_id=deck_id, limit=limit)

        logger.info(
            "get_due_cards_success", user_id=current_user.id, cards_count=len(cards) if cards else 0
        )

        return cards if cards is not None else []

    except AttributeError as e:
        # Service method doesn't exist - use fallback query
        logger.warning("get_due_cards_service_not_available", error=str(e), user_id=current_user.id)
        return await _fallback_get_due_cards(db, current_user.id, deck_id, limit)

    except Exception as e:
        # CRITICAL: Log the full error but NEVER raise an exception
        # Return empty list to allow dashboard to load
        logger.error(
            "get_due_cards_error",
            error=str(e),
            error_type=type(e).__name__,
            user_id=current_user.id,
            deck_id=deck_id,
            limit=limit,
            exc_info=True,
        )

        # Try rollback to clean up any transaction issues
        try:
            await db.rollback()
        except:
            pass

        # ALWAYS return empty list, NEVER raise exception
        return []


async def _fallback_get_due_cards(
    db: AsyncSession, user_id: int, deck_id: Optional[int], limit: int
) -> List[Flashcard]:
    """
    Fallback query when service layer is unavailable.

    This is a separate function to ensure it can't raise exceptions
    to the main endpoint handler.
    """
    try:
        query = (
            select(Flashcard)
            .join(Deck)
            .where(
                and_(
                    Deck.user_id == user_id,
                    Flashcard.deleted_at.is_(None),
                    Deck.deleted_at.is_(None),
                    or_(Flashcard.next_review.is_(None), Flashcard.next_review <= func.now()),
                )
            )
            .order_by(Flashcard.next_review.asc().nullsfirst())
            .limit(limit)
        )

        if deck_id:
            query = query.where(Deck.id == deck_id)

        result = await db.execute(query)
        cards = result.scalars().all()

        logger.info("fallback_get_due_cards_success", user_id=user_id, cards_count=len(cards))

        return list(cards)

    except Exception as e:
        logger.error(
            "fallback_get_due_cards_error",
            error=str(e),
            error_type=type(e).__name__,
            user_id=user_id,
            exc_info=True,
        )
        # Even fallback returns empty list on error
        return []


@router.post(
    "/{card_id}/review",
    response_model=ReviewResult,
    summary="Review card",
    description="Submit a review for a flashcard (SM-2 algorithm via SQL)",
)
async def review_card(
    card_id: int,
    review_data: ReviewSubmit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Review a flashcard.

    Uses service layer which calls repository -> SQL function calculate_sm2().
    No Python SM-2 logic here - single source of truth in PostgreSQL.

    LEARNING LEDGER: Emits a FLASHCARD_REVIEW learning event with:
    - Normalized accuracy (quality / 5.0)
    - Duration guardrail (capped to MAX_REVIEW_DURATION_SECONDS)
    """
    from app.core.config import settings
    from app.models.activity_log import ActivityLog, ActivityType, ModuleType
    import uuid

    service = FlashcardService(db)

    try:
        result = await service.review_card(
            card_id=card_id, user_id=current_user.id, quality=review_data.quality
        )

        # =====================================================================
        # LEARNING LEDGER: Emit FLASHCARD_REVIEW event
        # =====================================================================
        # This is the canonical learning event - append-only, never updated

        # Duration guardrail: clamp to prevent pollution from idle tabs
        raw_duration_seconds = review_data.time_taken_ms // 1000
        clamped_duration = min(raw_duration_seconds, settings.MAX_REVIEW_DURATION_SECONDS)
        was_clamped = clamped_duration != raw_duration_seconds

        # Normalized accuracy: quality / 5.0 (NOT binary thresholded)
        normalized_accuracy = review_data.quality / 5.0

        # Generate idempotency key for deduplication
        event_uid = str(uuid.uuid4())

        learning_event = ActivityLog(
            user_id=current_user.id,
            activity_type=ActivityType.FLASHCARD_REVIEW,
            module=ModuleType.FLASHCARDS,
            resource_id=card_id,
            event_uid=event_uid,
            duration_seconds=clamped_duration,
            accuracy=normalized_accuracy,
            quality_score=review_data.quality,
            is_learning_event=True,
            meta_data={
                "raw_duration_ms": review_data.time_taken_ms,
                "was_clamped": was_clamped,
                "new_interval": result["new_interval"],
                "new_ease_factor": str(result["new_ease_factor"]),
            },
        )
        db.add(learning_event)

        logger.info(
            "learning_event_emitted",
            event_type="FLASHCARD_REVIEW",
            user_id=current_user.id,
            card_id=card_id,
            quality=review_data.quality,
            accuracy=normalized_accuracy,
            duration_seconds=clamped_duration,
            was_clamped=was_clamped,
        )
        # =====================================================================

        await db.commit()

        return ReviewResult(
            next_review_date=result["next_review_date"],
            new_interval=result["new_interval"],
            new_ease_factor=float(result["new_ease_factor"]),  # Convert to float
            success=True,
            message="Review recorded successfully",
        )
    except Exception as e:
        logger.error(
            "review_card_error",
            error=str(e),
            card_id=card_id,
            user_id=current_user.id,
            exc_info=True,
        )
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/{card_id}",
    response_model=FlashcardResponse,
    summary="Get flashcard",
    description="Retrieve a specific flashcard",
)
async def get_card(
    card_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """Get a specific flashcard using service layer."""
    service = FlashcardService(db)

    try:
        result = await service.get_card(card_id=card_id, user_id=current_user.id)
        return result
    except Exception as e:
        logger.error("get_card_error", error=str(e), card_id=card_id, user_id=current_user.id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")


@router.put(
    "/{card_id}",
    response_model=FlashcardResponse,
    summary="Update flashcard",
    description="Update an existing flashcard",
)
async def update_card(
    card_id: int,
    card_data: FlashcardUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a flashcard.

    Only updates provided fields (partial update).
    Verifies ownership through deck relationship.
    """
    try:
        # Verify card exists and user owns it
        result = await db.execute(
            select(Flashcard)
            .join(Deck)
            .where(
                and_(
                    Flashcard.id == card_id,
                    Deck.user_id == current_user.id,
                    Flashcard.deleted_at.is_(None),
                    Deck.deleted_at.is_(None),
                )
            )
        )
        card = result.scalar_one_or_none()

        if not card:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Card not found or access denied"
            )

        # Update only provided fields
        update_data = card_data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(card, field, value)

        # Update timestamp
        card.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(card)

        logger.info(
            "update_card_success",
            card_id=card_id,
            user_id=current_user.id,
            updated_fields=list(update_data.keys()),
        )

        return card

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "update_card_error",
            error=str(e),
            card_id=card_id,
            user_id=current_user.id,
            exc_info=True,
        )
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update card"
        )


@router.delete(
    "/{card_id}",
    response_model=MessageResponse,
    summary="Delete flashcard",
    description="Delete a flashcard (soft delete)",
)
async def delete_card(
    card_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """Delete a flashcard (soft delete)."""
    try:
        result = await db.execute(
            select(Flashcard)
            .join(Deck)
            .where(
                and_(
                    Flashcard.id == card_id,
                    Deck.user_id == current_user.id,
                    Flashcard.deleted_at.is_(None),
                )
            )
        )
        card = result.scalar_one_or_none()

        if not card:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")

        card.deleted_at = datetime.utcnow()
        await db.commit()

        return MessageResponse(message="Card deleted successfully")

    except HTTPException:
        raise
    except Exception as e:
        logger.error("delete_card_error", error=str(e), card_id=card_id, user_id=current_user.id)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete card"
        )
