"""
Deck management REST API endpoints.

CRUD operations for flashcard decks + AI flashcard generation from documents.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from pydantic import BaseModel, Field
from datetime import datetime

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.deck import Deck
from app.models.flashcard import Flashcard

router = APIRouter()

# ============================================================================
# Request/Response Schemas
# ============================================================================


class DeckCreate(BaseModel):
    """Deck creation request."""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    is_public: bool = False


class DeckUpdate(BaseModel):
    """Deck update request."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    is_public: Optional[bool] = None


# ---------------------------------------------------------------------------
# Flashcard Generation Schemas (UPDATED VERSION)
# ---------------------------------------------------------------------------


class FlashcardGenerateRequest(BaseModel):
    """Flashcard generation from document request."""

    document_id: int = Field(..., description="Document to generate from")
    deck_name: str = Field(..., min_length=1, max_length=255, description="Name for the new deck")
    num_cards: int = Field(10, ge=1, le=50, description="Number of flashcards to generate")
    difficulty: str = Field("medium", description="Difficulty level: easy, medium, hard")
    tags: Optional[List[str]] = None


class FlashcardGenerateFromTopicRequest(BaseModel):
    """Flashcard generation from topic request (like quiz generation)."""

    topic: str = Field(
        ..., min_length=3, max_length=500, description="Topic to generate flashcards about"
    )
    deck_name: Optional[str] = Field(
        None, max_length=255, description="Optional deck name (defaults to topic)"
    )
    num_cards: int = Field(10, ge=5, le=50, description="Number of flashcards to generate")
    difficulty: str = Field("medium", description="Difficulty level: easy, medium, hard")
    tags: Optional[List[str]] = None


class FlashcardGenerateResponse(BaseModel):
    """Flashcard generation response."""

    deck_id: int
    deck_name: str
    cards_generated: int
    status: str
    message: str


class DeckResponse(BaseModel):
    """Deck response."""

    id: int
    name: str
    description: Optional[str]
    tags: Optional[List[str]]
    is_public: bool
    ai_generated: bool
    card_count: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    """Simple message response."""

    message: str


# ============================================================================
# Endpoints
# ============================================================================


@router.get(
    "",
    response_model=List[DeckResponse],
    summary="List decks",
    description="Retrieve user's decks with optional filtering",
)
async def list_decks(
    tags: Optional[str] = Query(None, description="Filter by tags (comma-separated)"),
    is_public: Optional[bool] = Query(None, description="Filter by public status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List user's decks with card counts (optimized - single query)."""
    # Single query with LEFT OUTER JOIN to get decks and card counts together
    stmt = (
        select(
            Deck,
            func.count(Flashcard.id).filter(Flashcard.deleted_at.is_(None)).label("card_count"),
        )
        .outerjoin(Flashcard, Flashcard.deck_id == Deck.id)
        .where(and_(Deck.user_id == current_user.id, Deck.deleted_at.is_(None)))
    )

    if is_public is not None:
        stmt = stmt.where(Deck.is_public == is_public)

    if tags:
        tag_list = [t.strip() for t in tags.split(",")]
        stmt = stmt.where(Deck.tags.contains(tag_list))

    stmt = (
        stmt.group_by(Deck.id)
        .order_by(Deck.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    result = await db.execute(stmt)
    decks_with_counts = result.all()

    return [
        DeckResponse(
            id=deck.id,
            name=deck.name,
            description=deck.description,
            tags=deck.tags,
            is_public=deck.is_public,
            ai_generated=deck.ai_generated,
            card_count=card_count,
            user_id=deck.user_id,
            created_at=deck.created_at,
            updated_at=deck.updated_at,
        )
        for deck, card_count in decks_with_counts
    ]


@router.post(
    "",
    response_model=DeckResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create deck",
    description="Create a new flashcard deck",
)
async def create_deck(
    deck_data: DeckCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    new_deck = Deck(
        user_id=current_user.id,
        name=deck_data.name,
        description=deck_data.description,
        tags=deck_data.tags,
        is_public=deck_data.is_public,
        ai_generated=False,
    )

    db.add(new_deck)
    await db.commit()
    await db.refresh(new_deck)

    return DeckResponse(
        id=new_deck.id,
        name=new_deck.name,
        description=new_deck.description,
        tags=new_deck.tags,
        is_public=new_deck.is_public,
        ai_generated=new_deck.ai_generated,
        card_count=0,
        user_id=new_deck.user_id,
        created_at=new_deck.created_at,
        updated_at=new_deck.updated_at,
    )


@router.get(
    "/{deck_id}",
    response_model=DeckResponse,
    summary="Get deck",
    description="Retrieve a specific deck by ID",
)
async def get_deck(
    deck_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Deck).where(
            and_(Deck.id == deck_id, Deck.user_id == current_user.id, Deck.deleted_at.is_(None))
        )
    )
    deck = result.scalar_one_or_none()

    if not deck:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deck not found")

    card_count_result = await db.execute(
        select(func.count(Flashcard.id)).where(
            and_(Flashcard.deck_id == deck.id, Flashcard.deleted_at.is_(None))
        )
    )
    card_count = card_count_result.scalar()

    return DeckResponse(
        id=deck.id,
        name=deck.name,
        description=deck.description,
        tags=deck.tags,
        is_public=deck.is_public,
        ai_generated=deck.ai_generated,
        card_count=card_count,
        user_id=deck.user_id,
        created_at=deck.created_at,
        updated_at=deck.updated_at,
    )


@router.get(
    "/{deck_id}/cards",
    summary="List deck cards",
    description="Get all flashcards in a deck",
)
async def list_deck_cards(
    deck_id: int,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(100, ge=1, le=500, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all flashcards in a deck.

    This returns ALL cards in the deck, not just due cards.
    Used by DeckDetailPage to display the full card list.
    """
    # Verify deck ownership
    deck_result = await db.execute(
        select(Deck).where(
            and_(Deck.id == deck_id, Deck.user_id == current_user.id, Deck.deleted_at.is_(None))
        )
    )
    deck = deck_result.scalar_one_or_none()

    if not deck:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deck not found")

    # Get all cards in the deck
    offset = (page - 1) * page_size
    cards_result = await db.execute(
        select(Flashcard)
        .where(and_(Flashcard.deck_id == deck_id, Flashcard.deleted_at.is_(None)))
        .order_by(Flashcard.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    cards = cards_result.scalars().all()

    # Return cards as list of dicts to match FlashcardResponse format
    return [
        {
            "id": card.id,
            "deck_id": card.deck_id,
            "front_text": card.front_text,
            "back_text": card.back_text,
            "front_media_url": card.front_media_url,
            "back_media_url": card.back_media_url,
            "ease_factor": float(card.ease_factor) if card.ease_factor else 2.5,
            "interval": card.interval or 0,
            "repetitions": card.repetitions or 0,
            "last_review": card.last_review,
            "next_review": card.next_review,
            "learning_state": card.learning_state or "new",
            "times_reviewed": card.times_reviewed or 0,
            "accuracy": (
                card.times_correct / card.times_reviewed
                if card.times_reviewed and card.times_reviewed > 0
                else 0.0
            ),
            "deck_name": deck.name,
        }
        for card in cards
    ]


@router.put(
    "/{deck_id}",
    response_model=DeckResponse,
    summary="Update deck",
    description="Update an existing deck",
)
async def update_deck(
    deck_id: int,
    deck_data: DeckUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Deck).where(
            and_(Deck.id == deck_id, Deck.user_id == current_user.id, Deck.deleted_at.is_(None))
        )
    )
    deck = result.scalar_one_or_none()

    if not deck:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deck not found")

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

    card_count_result = await db.execute(
        select(func.count(Flashcard.id)).where(
            and_(Flashcard.deck_id == deck.id, Flashcard.deleted_at.is_(None))
        )
    )
    card_count = card_count_result.scalar()

    return DeckResponse(
        id=deck.id,
        name=deck.name,
        description=deck.description,
        tags=deck.tags,
        is_public=deck.is_public,
        ai_generated=deck.ai_generated,
        card_count=card_count,
        user_id=deck.user_id,
        created_at=deck.created_at,
        updated_at=deck.updated_at,
    )


@router.delete(
    "/{deck_id}",
    response_model=MessageResponse,
    summary="Delete deck",
    description="Delete a deck (soft delete)",
)
async def delete_deck(
    deck_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Deck).where(
            and_(Deck.id == deck_id, Deck.user_id == current_user.id, Deck.deleted_at.is_(None))
        )
    )
    deck = result.scalar_one_or_none()

    if not deck:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deck not found")

    deck.deleted_at = datetime.utcnow()
    await db.commit()

    return MessageResponse(message="Deck deleted successfully")


# ============================================================================
# Flashcard Generation Endpoint (UPDATED VERSION)
# ============================================================================


@router.post(
    "/generate",
    response_model=FlashcardGenerateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate flashcards from document",
    description="Use AI to generate flashcards from a document",
)
async def generate_flashcards(
    request_data: FlashcardGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate flashcards from a document using AI.

    Steps:
    1. Verify ownership and ensure document is fully processed
    2. Create deck with AI metadata
    3. Use DocumentAgent to generate flashcards
    4. Save flashcards into DB
    """
    from app.models.document import Document
    from app.core.ai.agents.factory import create_agent
    from app.modules.flashcards.service import FlashcardService

    # Verify document ownership
    doc_result = await db.execute(
        select(Document).where(
            and_(
                Document.id == request_data.document_id,
                Document.user_id == current_user.id,
                Document.deleted_at.is_(None),
            )
        )
    )
    document = doc_result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # Validate processing
    if document.processing_status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Document processing status is '{document.processing_status}'. Must be 'completed'.",
        )

    if not document.content_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document has no extractable text content",
        )

    # Create the deck
    service = FlashcardService(db)
    deck_data = {
        "name": request_data.deck_name,
        "description": f"AI-generated flashcards from {document.filename}",
        "tags": request_data.tags or ["ai-generated"],
        "is_public": False,
        "ai_generated": True,
        "ai_metadata": {
            "source_document_id": document.id,
            "generation_params": {
                "num_cards": request_data.num_cards,
                "difficulty": request_data.difficulty,
            },
        },
    }

    try:
        deck = await service.create_deck(user_id=current_user.id, data=deck_data)

        agent = await create_agent("document")

        generation_prompt = f"""
Generate {request_data.num_cards} high-quality flashcards from this document.

Difficulty: {request_data.difficulty}

Document content (first 8000 chars):
{document.content_text[:8000]}

Output JSON:
{{
  "flashcards": [
    {{
      "front": "Question or term",
      "back": "Answer or definition"
    }}
  ]
}}
"""

        result = await agent.execute(
            user_id=current_user.id, input=generation_prompt, context={"document_id": document.id}
        )

        if not result.success:
            raise Exception(result.error)

        import json, re

        json_match = re.search(r'\{[\s\S]*"flashcards"[\s\S]*\}', result.output)
        if not json_match:
            raise Exception("Could not parse flashcards JSON")

        flashcard_data = json.loads(json_match.group())
        flashcards = flashcard_data.get("flashcards", [])

        cards_created = 0
        for fc in flashcards[: request_data.num_cards]:
            if "front" in fc and "back" in fc:
                await service.create_card(
                    user_id=current_user.id,
                    data={
                        "deck_id": deck["id"],
                        "front_text": fc["front"],
                        "back_text": fc["back"],
                    },
                )
                cards_created += 1

        await db.commit()

        return FlashcardGenerateResponse(
            deck_id=deck["id"],
            deck_name=deck["name"],
            cards_generated=cards_created,
            status="success",
            message=f"Successfully generated {cards_created} flashcards",
        )

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to generate flashcards: {str(e)}")


# ============================================================================
# Topic-Based Flashcard Generation (Like Quiz Generation)
# ============================================================================


@router.post(
    "/generate-from-topic",
    response_model=FlashcardGenerateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate flashcards from topic",
    description="Use AI to generate flashcards from any topic",
)
async def generate_flashcards_from_topic(
    request_data: FlashcardGenerateFromTopicRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate flashcards from a topic using AI.
    Similar to quiz generation but creates flashcards instead.
    """
    from app.modules.flashcards.service import FlashcardService
    import structlog
    import json
    import re

    logger = structlog.get_logger(__name__)

    try:
        from app.core.ai.orchestrator import get_orchestrator

        # Build generation prompt
        difficulty_desc = {
            "easy": "simple, beginner-level concepts",
            "medium": "intermediate, moderate complexity",
            "hard": "challenging, advanced concepts",
        }

        prompt = f"""Generate flashcards about: {request_data.topic}

Requirements:
- Generate exactly {request_data.num_cards} high-quality flashcards
- Difficulty: {difficulty_desc.get(request_data.difficulty, "intermediate")}
- Each flashcard should have a clear question/term on front and answer/definition on back
- Cover key concepts comprehensively
- Make them educational and useful for studying

Return ONLY valid JSON in this exact format:
{{
  "flashcards": [
    {{
      "front": "Question or term",
      "back": "Answer or definition"
    }}
  ]
}}
"""

        # Get orchestrator and generate
        orchestrator = get_orchestrator()
        result = await orchestrator.handle_message(
            user_id=current_user.id,
            session_id=0,  # No session for generation
            message=prompt,
            context={"intent": "flashcard_generation"},
        )

        if not result.success:
            raise Exception(result.error or "AI generation failed")

        # Parse AI response
        response_text = result.output

        # Extract JSON from response
        json_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", response_text)
        if json_match:
            json_str = json_match.group(1)
        else:
            json_start = response_text.find("{")
            json_end = response_text.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response_text[json_start:json_end]
            else:
                raise ValueError("Could not extract JSON from response")

        flashcard_data = json.loads(json_str)
        flashcards = flashcard_data.get("flashcards", [])

        if not flashcards:
            raise ValueError("No flashcards in response")

        # Create deck
        deck_name = request_data.deck_name or f"Flashcards: {request_data.topic}"
        service = FlashcardService(db)

        deck_data = {
            "name": deck_name,
            "description": f"AI-generated flashcards about {request_data.topic}",
            "tags": request_data.tags
            or ["ai-generated", request_data.topic.lower().replace(" ", "-")[:30]],
            "is_public": False,
            "ai_generated": True,
            "ai_metadata": {
                "source_topic": request_data.topic,
                "generation_params": {
                    "num_cards": request_data.num_cards,
                    "difficulty": request_data.difficulty,
                },
            },
        }

        deck = await service.create_deck(user_id=current_user.id, data=deck_data)

        # Create flashcards
        cards_created = 0
        for fc in flashcards[: request_data.num_cards]:
            if "front" in fc and "back" in fc:
                await service.create_card(
                    user_id=current_user.id,
                    data={
                        "deck_id": deck["id"],
                        "front_text": fc["front"],
                        "back_text": fc["back"],
                    },
                )
                cards_created += 1

        await db.commit()

        logger.info(
            "flashcards_generated_from_topic",
            topic=request_data.topic,
            deck_id=deck["id"],
            cards_created=cards_created,
        )

        return FlashcardGenerateResponse(
            deck_id=deck["id"],
            deck_name=deck["name"],
            cards_generated=cards_created,
            status="success",
            message=f"Successfully generated {cards_created} flashcards about {request_data.topic}",
        )

    except json.JSONDecodeError as e:
        logger.error("flashcard_generation_json_error", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        logger.error("flashcard_generation_failed", error=str(e))
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to generate flashcards: {str(e)}")


# ============================================================================
# Bulk Import Endpoint
# ============================================================================


class ImportCard(BaseModel):
    """Card data for import."""

    front: str = Field(..., min_length=1)
    back: str = Field(..., min_length=1)


class ImportRequest(BaseModel):
    """Import request."""

    cards: List[ImportCard] = Field(..., min_length=1, max_length=1000)


class ImportResult(BaseModel):
    """Structured import result."""

    imported: int
    skipped_duplicates: int
    errors: List[str]
    message: str


@router.post(
    "/{deck_id}/import",
    response_model=ImportResult,
    status_code=status.HTTP_201_CREATED,
    summary="Import flashcards",
    description="Bulk import flashcards into a deck",
)
async def import_flashcards(
    deck_id: int,
    import_data: ImportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Bulk import flashcards into a deck with transaction safety and duplicate detection.
    """
    # Verify deck ownership
    result = await db.execute(
        select(Deck).where(
            and_(Deck.id == deck_id, Deck.user_id == current_user.id, Deck.deleted_at.is_(None))
        )
    )
    deck = result.scalar_one_or_none()

    if not deck:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deck not found")

    errors: List[str] = []
    skipped_duplicates = 0

    try:
        # Query existing front_text values for duplicate detection (case-normalized)
        existing_result = await db.execute(
            select(func.lower(Flashcard.front_text)).where(
                and_(Flashcard.deck_id == deck.id, Flashcard.deleted_at.is_(None))
            )
        )
        existing_fronts = {row[0].strip() for row in existing_result.fetchall()}

        # Build flashcard objects for bulk insert, skipping duplicates
        flashcards = []
        for i, card in enumerate(import_data.cards):
            try:
                front_normalized = card.front.strip().lower()

                # Check for duplicate
                if front_normalized in existing_fronts:
                    skipped_duplicates += 1
                    continue

                # Track this front to avoid duplicates within the import batch
                existing_fronts.add(front_normalized)

                flashcards.append(
                    Flashcard(
                        deck_id=deck.id,
                        user_id=current_user.id,
                        front_text=card.front.strip(),
                        back_text=card.back.strip(),
                    )
                )
            except Exception as e:
                errors.append(f"Card {i + 1}: {str(e)}")

        # Bulk insert with explicit transaction
        if flashcards:
            db.add_all(flashcards)
            await db.commit()

        # Build message
        msg_parts = [f"Successfully imported {len(flashcards)} flashcards"]
        if skipped_duplicates > 0:
            msg_parts.append(f"{skipped_duplicates} duplicates skipped")
        if errors:
            msg_parts.append(f"{len(errors)} errors")

        return ImportResult(
            imported=len(flashcards),
            skipped_duplicates=skipped_duplicates,
            errors=errors,
            message=" | ".join(msg_parts),
        )

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to import flashcards: {str(e)}")
