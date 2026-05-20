"""
Deck management REST API endpoints.

Thin controller — business logic lives in:
- Service layer: app/services/deck_generation_service.py
- Schemas: app/schemas/flashcard.py
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, update
from datetime import datetime, timezone

from app.api.deps import get_db, get_current_user, PaginationParams
from app.models.user import User
from app.models.deck import Deck
from app.models.flashcard import Flashcard
from app.schemas.common import MessageResponse
from app.schemas.study import (
    DeckCreate,
    DeckUpdate,
    DeckResponse,
    FlashcardGenerateRequest,
    FlashcardGenerateFromTopicRequest,
    FlashcardGenerateResponse,
    ImportRequest,
    ImportResult,
)
from app.services.deck.generation import (
    generate_from_document,
    generate_from_topic,
    bulk_import,
)

router = APIRouter()


# ============================================================================
# CRUD Endpoints
# ============================================================================


@router.get("", response_model=List[DeckResponse])
async def list_decks(
    tags: Optional[str] = Query(None, description="Filter by tags (comma-separated)"),
    is_public: Optional[bool] = Query(None, description="Filter by public status"),
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List user's decks with card counts and due counts."""
    now = datetime.now(timezone.utc)

    stmt = (
        select(
            Deck,
            func.count(Flashcard.id).filter(Flashcard.deleted_at.is_(None)).label("card_count"),
            func.count(Flashcard.id).filter(
                and_(
                    Flashcard.deleted_at.is_(None),
                    or_(Flashcard.next_review.is_(None), Flashcard.next_review <= now),
                )
            ).label("due_count"),
        )
        .outerjoin(Flashcard, Flashcard.deck_id == Deck.id)
        .where(and_(Deck.user_id == current_user.id, Deck.deleted_at.is_(None)))
    )

    if is_public is not None:
        stmt = stmt.where(Deck.is_public == is_public)
    if tags:
        tag_list = [t.strip() for t in tags.split(",")]
        stmt = stmt.where(Deck.tags.contains(tag_list))

    stmt = stmt.group_by(Deck.id).order_by(Deck.updated_at.desc()).offset(pagination.offset).limit(pagination.page_size)
    result = await db.execute(stmt)
    return [_deck_response(deck, card_count, due_count) for deck, card_count, due_count in result.all()]


@router.post("", response_model=DeckResponse, status_code=status.HTTP_201_CREATED)
async def create_deck(
    deck_data: DeckCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new flashcard deck."""
    new_deck = Deck(
        user_id=current_user.id, name=deck_data.name, description=deck_data.description,
        tags=deck_data.tags, is_public=deck_data.is_public, ai_generated=False,
    )
    db.add(new_deck)
    await db.commit()
    await db.refresh(new_deck)
    return _deck_response(new_deck, 0, 0)


@router.get("/{deck_id}", response_model=DeckResponse)
async def get_deck(
    deck_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    """Retrieve a specific deck by ID."""
    deck = await _get_user_deck(db, deck_id, current_user.id)
    card_count, due_count = await _count_cards(db, deck.id)
    return _deck_response(deck, card_count, due_count)


@router.get("/{deck_id}/cards")
async def list_deck_cards(
    deck_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all flashcards in a deck."""
    deck = await _get_user_deck(db, deck_id, current_user.id)

    cards_result = await db.execute(
        select(Flashcard)
        .where(and_(Flashcard.deck_id == deck_id, Flashcard.deleted_at.is_(None)))
        .order_by(Flashcard.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return [
        {
            "id": c.id, "deck_id": c.deck_id, "front_text": c.front_text, "back_text": c.back_text,
            "front_media_url": c.front_media_url, "back_media_url": c.back_media_url,
            "ease_factor": float(c.ease_factor) if c.ease_factor else 2.5,
            "interval": c.interval or 0, "repetitions": c.repetitions or 0,
            "last_review": c.last_review, "next_review": c.next_review,
            "learning_state": c.learning_state or "new", "times_reviewed": c.times_reviewed or 0,
            "accuracy": c.times_correct / c.times_reviewed if c.times_reviewed and c.times_reviewed > 0 else 0.0,
            "deck_name": deck.name,
        }
        for c in cards_result.scalars().all()
    ]


@router.put("/{deck_id}", response_model=DeckResponse)
async def update_deck(
    deck_id: int, deck_data: DeckUpdate,
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    """Update an existing deck."""
    deck = await _get_user_deck(db, deck_id, current_user.id)

    if deck_data.name is not None:
        deck.name = deck_data.name
    if deck_data.description is not None:
        deck.description = deck_data.description
    if deck_data.tags is not None:
        deck.tags = deck_data.tags
    if deck_data.is_public is not None:
        deck.is_public = deck_data.is_public

    await db.commit()
    await db.refresh(deck)
    card_count, due_count = await _count_cards(db, deck.id)
    return _deck_response(deck, card_count, due_count)


@router.delete("/{deck_id}", response_model=MessageResponse)
async def delete_deck(
    deck_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    """Delete a deck (soft delete with cascade to flashcards)."""
    deck = await _get_user_deck(db, deck_id, current_user.id)

    await db.execute(
        update(Flashcard)
        .where(and_(Flashcard.deck_id == deck_id, Flashcard.deleted_at.is_(None)))
        .values(deleted_at=datetime.now(timezone.utc))
    )
    deck.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return MessageResponse(message="Deck and flashcards deleted successfully")


# ============================================================================
# Generation & Import Endpoints
# ============================================================================


@router.post("/generate", response_model=FlashcardGenerateResponse, status_code=status.HTTP_201_CREATED)
async def generate_flashcards(
    request_data: FlashcardGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate flashcards from a document using AI."""
    try:
        result = await generate_from_document(
            user_id=current_user.id, document_id=request_data.document_id,
            deck_name=request_data.deck_name, num_cards=request_data.num_cards,
            difficulty=request_data.difficulty, tags=request_data.tags, db=db,
        )
        return FlashcardGenerateResponse(**result)
    except ValueError as e:
        code = status.HTTP_404_NOT_FOUND if "not found" in str(e).lower() else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=code, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to generate flashcards: {e}")


@router.post("/generate-from-topic", response_model=FlashcardGenerateResponse, status_code=status.HTTP_201_CREATED)
async def generate_flashcards_from_topic(
    request_data: FlashcardGenerateFromTopicRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate flashcards from a topic using AI."""
    try:
        result = await generate_from_topic(
            user_id=current_user.id, topic=request_data.topic,
            num_cards=request_data.num_cards, difficulty=request_data.difficulty,
            deck_name=request_data.deck_name, tags=request_data.tags, db=db,
        )
        return FlashcardGenerateResponse(**result)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to generate flashcards: {e}")


@router.post("/{deck_id}/import", response_model=ImportResult, status_code=status.HTTP_201_CREATED)
async def import_flashcards(
    deck_id: int, import_data: ImportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Bulk import flashcards into a deck."""
    try:
        result = await bulk_import(user_id=current_user.id, deck_id=deck_id, cards=import_data.cards, db=db)
        return ImportResult(**result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to import: {e}")


# ============================================================================
# Analytics Endpoint — canonical URL: GET /decks/{id}/analytics
# (The collections router had a duplicate under /collections/decks/{id}/analytics
#  which is now deprecated in favour of this canonical path.)
# ============================================================================


@router.get("/{deck_id}/analytics", summary="Deck Analytics")
async def get_deck_analytics(
    deck_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Return comprehensive learning analytics for a deck.

    Includes:
    - Card state distribution (new / learning / review / mastered)
    - Forecast: cards due in 1/7/30 days
    - Accuracy, average ease factor, retention rate
    - Review load projection
    """
    from app.services.flashcards.analytics_service import FlashcardAnalyticsService

    deck = await _get_user_deck(db, deck_id, current_user.id)
    service = FlashcardAnalyticsService(db)
    try:
        return await service.get_deck_analytics(deck_id=deck.id, user_id=current_user.id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analytics error: {e}")




@router.get("/{deck_id}/export", summary="Export Deck (JSON)")
async def export_deck(
    deck_id: int,
    include_stats: bool = Query(True, description="Include review statistics per card"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Export a deck and all its flashcards as JSON.

    The output format is re-importable via POST /{deck_id}/import.
    """
    from app.services.deck.import_export import export_deck_json

    try:
        return await export_deck_json(
            user_id=current_user.id,
            deck_id=deck_id,
            db=db,
            include_stats=include_stats,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/{deck_id}/export/csv", summary="Export Deck (CSV)")
async def export_deck_csv_endpoint(
    deck_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Export a deck's flashcards as CSV.

    Returns a downloadable CSV file with columns:
    front_text, back_text, front_media_url, back_media_url,
    ease_factor, interval, learning_state.
    """
    from fastapi.responses import StreamingResponse
    from app.services.deck.import_export import export_deck_csv

    try:
        csv_content = await export_deck_csv(
            user_id=current_user.id, deck_id=deck_id, db=db
        )
        return StreamingResponse(
            iter([csv_content]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=deck_{deck_id}_export.csv"
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{deck_id}/import/csv", response_model=ImportResult, status_code=status.HTTP_201_CREATED)
async def import_deck_csv(
    deck_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Import flashcards from a CSV file.

    Expects columns: front_text (required), back_text (required),
    front_media_url (optional), back_media_url (optional).
    """
    from app.services.deck.import_export import import_from_csv

    try:
        csv_content = (await file.read()).decode("utf-8")
        result = await import_from_csv(
            user_id=current_user.id,
            deck_id=deck_id,
            csv_content=csv_content,
            db=db,
        )
        return ImportResult(**result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to import CSV: {e}")


# ============================================================================
# Internal Helpers
# ============================================================================


async def _get_user_deck(db: AsyncSession, deck_id: int, user_id: int) -> Deck:
    """Get deck owned by user or raise 404."""
    result = await db.execute(
        select(Deck).where(and_(Deck.id == deck_id, Deck.user_id == user_id, Deck.deleted_at.is_(None)))
    )
    deck = result.scalar_one_or_none()
    if not deck:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deck not found")
    return deck


async def _count_cards(db: AsyncSession, deck_id: int) -> tuple:
    """Return (card_count, due_count) for a deck."""
    now = datetime.now(timezone.utc)
    card_count = (await db.execute(
        select(func.count(Flashcard.id)).where(and_(Flashcard.deck_id == deck_id, Flashcard.deleted_at.is_(None)))
    )).scalar() or 0
    due_count = (await db.execute(
        select(func.count(Flashcard.id)).where(and_(
            Flashcard.deck_id == deck_id, Flashcard.deleted_at.is_(None),
            or_(Flashcard.next_review.is_(None), Flashcard.next_review <= now),
        ))
    )).scalar() or 0
    return card_count, due_count


def _deck_response(deck: Deck, card_count: int, due_count: int) -> DeckResponse:
    """Build a DeckResponse from a Deck model + counts."""
    return DeckResponse(
        id=deck.id, name=deck.name, description=deck.description, tags=deck.tags,
        is_public=deck.is_public, ai_generated=deck.ai_generated, card_count=card_count,
        due_count=due_count or 0, user_id=deck.user_id, created_at=deck.created_at, updated_at=deck.updated_at,
    )
