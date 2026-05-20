"""
Collections REST API.

Endpoints:
    POST   /collections/                       — create collection
    GET    /collections/                       — list user's collections
    GET    /collections/{id}                   — get collection with its decks
    PATCH  /collections/{id}                   — rename / redescribe
    DELETE /collections/{id}                   — delete (decks become uncategorised)
    POST   /collections/assign                 — assign deck to collection
    POST   /collections/suggest                — AI collection suggestion for a deck

    GET    /decks/{deck_id}/analytics          — per-deck analytics
    POST   /decks/{deck_id}/import/csv         — bulk CSV import
"""

from __future__ import annotations

import csv
import io
from typing import List, Optional

import structlog
from fastapi import APIRouter, Body, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.services.flashcards.collection_service import CollectionService
from app.services.flashcards.analytics_service import DeckAnalyticsService
from app.modules.flashcards.service import FlashcardService

logger = structlog.get_logger(__name__)

router = APIRouter()


# ── Request / Response schemas ────────────────────────────────────────────────


class CreateCollectionRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    parent_id: Optional[int] = None


class UpdateCollectionRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None


class AssignDeckRequest(BaseModel):
    deck_id: int
    collection_id: Optional[int] = None  # None = unassign (move to uncategorised)


class SuggestCollectionRequest(BaseModel):
    deck_name: str
    deck_description: Optional[str] = None


# ── Collections CRUD ──────────────────────────────────────────────────────────


@router.post("/", status_code=status.HTTP_201_CREATED, tags=["Collections"])
async def create_collection(
    body: CreateCollectionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new collection (folder) for organising decks."""
    service = CollectionService(db)
    return await service.create_collection(current_user.id, body.model_dump())


@router.get("/", tags=["Collections"])
async def list_collections(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all of the current user's collections with deck counts."""
    service = CollectionService(db)
    return await service.list_collections(current_user.id)


@router.get("/{collection_id}", tags=["Collections"])
async def get_collection(
    collection_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a collection together with its decks."""
    service = CollectionService(db)
    try:
        return await service.get_collection(collection_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.patch("/{collection_id}", tags=["Collections"])
async def update_collection(
    collection_id: int,
    body: UpdateCollectionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Rename or redescribe a collection."""
    service = CollectionService(db)
    try:
        return await service.update_collection(
            collection_id, current_user.id, body.model_dump(exclude_none=True)
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Collections"])
async def delete_collection(
    collection_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a collection. Its decks become uncategorised (not deleted)."""
    service = CollectionService(db)
    try:
        await service.delete_collection(collection_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post("/assign", tags=["Collections"])
async def assign_deck_to_collection(
    body: AssignDeckRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Assign a deck to a collection, or unassign it (collection_id=null)."""
    service = CollectionService(db)
    try:
        return await service.assign_deck(body.deck_id, current_user.id, body.collection_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post("/suggest", tags=["Collections"])
async def suggest_collection(
    body: SuggestCollectionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Ask the AI which collection a deck should go in.

    Returns action='existing' with a collection_id, or action='create'
    with a suggested collection name. Non-blocking — returns null if AI fails.
    """
    service = CollectionService(db)
    suggestion = await service.suggest_collection(
        current_user.id, body.deck_name, body.deck_description
    )
    if suggestion is None:
        return {"suggestion": None, "message": "AI categorisation unavailable"}
    return suggestion


# ── Deck analytics ────────────────────────────────────────────────────────────


@router.get("/decks/{deck_id}/analytics", tags=["Analytics"])
async def get_deck_analytics(
    deck_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Per-deck analytics.

    Returns mastery distribution, recall rate, Ebbinghaus retention curve,
    weak card list, and 30-day consistency window.
    """
    service = DeckAnalyticsService(db)
    try:
        return await service.get_deck_analytics(deck_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


# ── CSV Import ────────────────────────────────────────────────────────────────


@router.post("/decks/{deck_id}/import/csv", tags=["Import"])
async def import_csv(
    deck_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Bulk import flashcards from a CSV file into an existing deck.

    CSV format — two required columns (order flexible, header required):
        front, back

    Optional columns (used if present):
        topic          Noun-phrase concept name (feeds concept_mastery bridge)
        front_media_url
        back_media_url

    Returns:
        {imported, skipped_duplicates, errors, message}
    """
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a .csv",
        )

    # Size guard — 5 MB max
    MAX_BYTES = 5 * 1024 * 1024
    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="CSV file exceeds 5 MB limit",
        )

    # Parse CSV
    try:
        text_io = io.StringIO(content.decode("utf-8-sig"))  # strip BOM if present
        reader = csv.DictReader(text_io)

        required = {"front", "back"}
        if not reader.fieldnames or not required.issubset(
            {f.strip().lower() for f in reader.fieldnames}
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="CSV must have 'front' and 'back' columns",
            )

        # Normalise field names to lowercase
        rows = []
        for row in reader:
            normalised = {k.strip().lower(): v.strip() for k, v in row.items()}
            rows.append(normalised)

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"CSV parse error: {exc}",
        )

    if not rows:
        return {
            "imported": 0,
            "skipped_duplicates": 0,
            "errors": [],
            "message": "CSV file was empty",
        }

    # Import via FlashcardService (duplicate detection included)
    service = FlashcardService(db)
    errors: List[str] = []
    skipped = 0
    imported = 0

    # Fetch existing fronts for duplicate detection
    from sqlalchemy import select, and_, func
    from app.models.flashcard import Flashcard
    from app.models.deck import Deck

    # Verify deck ownership first
    deck_result = await db.execute(
        select(Deck).where(
            and_(Deck.id == deck_id, Deck.user_id == current_user.id, Deck.deleted_at.is_(None))
        )
    )
    deck = deck_result.scalar_one_or_none()
    if not deck:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deck not found")

    existing_result = await db.execute(
        select(func.lower(Flashcard.front_text)).where(
            and_(Flashcard.deck_id == deck_id, Flashcard.deleted_at.is_(None))
        )
    )
    existing_fronts = {row[0].strip() for row in existing_result.fetchall()}

    for i, row in enumerate(rows, start=2):  # start=2 because row 1 is header
        front = row.get("front", "").strip()
        back = row.get("back", "").strip()

        if not front or not back:
            errors.append(f"Row {i}: missing front or back text")
            continue

        if front.lower() in existing_fronts:
            skipped += 1
            continue

        try:
            await service.create_card(
                user_id=current_user.id,
                data={
                    "deck_id": deck_id,
                    "front_text": front,
                    "back_text": back,
                    "topic": row.get("topic") or None,
                    "front_media_url": row.get("front_media_url") or None,
                    "back_media_url": row.get("back_media_url") or None,
                },
            )
            existing_fronts.add(front.lower())
            imported += 1
        except Exception as exc:
            errors.append(f"Row {i}: {exc}")

    parts = [f"Imported {imported} cards"]
    if skipped:
        parts.append(f"{skipped} duplicates skipped")
    if errors:
        parts.append(f"{len(errors)} errors")

    logger.info(
        "csv_import_complete",
        deck_id=deck_id,
        user_id=current_user.id,
        imported=imported,
        skipped=skipped,
        errors=len(errors),
    )

    return {
        "imported": imported,
        "skipped_duplicates": skipped,
        "errors": errors[:20],  # cap error list to avoid huge responses
        "message": " | ".join(parts),
    }
