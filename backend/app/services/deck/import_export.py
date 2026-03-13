"""
Deck import/export service.

Supports:
- Export deck + flashcards as JSON (full fidelity, re-importable)
- Export deck + flashcards as CSV (spreadsheet-friendly)
- Import from JSON (with duplicate detection via bulk_import)
- Import from CSV (front_text, back_text columns)
"""

import csv
import io
import json
import logging
from typing import Any, Dict, List, Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.deck import Deck
from app.models.flashcard import Flashcard

logger = logging.getLogger(__name__)


# ============================================================================
# Export
# ============================================================================


async def export_deck_json(
    user_id: int, deck_id: int, db: AsyncSession, include_stats: bool = True
) -> Dict[str, Any]:
    """
    Export a deck and its flashcards as a JSON-serializable dict.

    The output format is designed to be re-importable via import.

    Args:
        user_id: Owner user ID
        deck_id: Deck to export
        db: Database session
        include_stats: Include review statistics per card

    Returns:
        Dict with deck metadata and cards array
    """
    deck = await _get_user_deck(db, deck_id, user_id)

    # Fetch all active flashcards
    result = await db.execute(
        select(Flashcard).where(
            and_(
                Flashcard.deck_id == deck_id,
                Flashcard.deleted_at.is_(None),
            )
        ).order_by(Flashcard.id)
    )
    flashcards = list(result.scalars().all())

    cards = []
    for fc in flashcards:
        card_data = {
            "front_text": fc.front_text,
            "back_text": fc.back_text,
        }
        if fc.front_media_url:
            card_data["front_media_url"] = fc.front_media_url
        if fc.back_media_url:
            card_data["back_media_url"] = fc.back_media_url

        if include_stats:
            card_data["stats"] = {
                "ease_factor": float(fc.ease_factor),
                "interval": fc.interval,
                "repetitions": fc.repetitions,
                "learning_state": fc.learning_state.value if fc.learning_state else None,
                "times_reviewed": fc.times_reviewed,
                "times_correct": fc.times_correct,
                "times_incorrect": fc.times_incorrect,
            }

        cards.append(card_data)

    export_data = {
        "format": "synapse_deck_v1",
        "deck": {
            "name": deck.name,
            "description": deck.description,
            "tags": deck.tags or [],
            "is_public": deck.is_public,
            "ai_generated": deck.ai_generated,
        },
        "cards": cards,
        "card_count": len(cards),
    }

    logger.info(
        "deck_exported_json",
        deck_id=deck_id,
        card_count=len(cards),
    )

    return export_data


async def export_deck_csv(
    user_id: int, deck_id: int, db: AsyncSession
) -> str:
    """
    Export a deck's flashcards as CSV string.

    Columns: front_text, back_text, front_media_url, back_media_url,
             ease_factor, interval, learning_state

    Args:
        user_id: Owner user ID
        deck_id: Deck to export
        db: Database session

    Returns:
        CSV string content
    """
    await _get_user_deck(db, deck_id, user_id)

    result = await db.execute(
        select(Flashcard).where(
            and_(
                Flashcard.deck_id == deck_id,
                Flashcard.deleted_at.is_(None),
            )
        ).order_by(Flashcard.id)
    )
    flashcards = list(result.scalars().all())

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "front_text", "back_text",
        "front_media_url", "back_media_url",
        "ease_factor", "interval", "learning_state",
    ])

    for fc in flashcards:
        writer.writerow([
            fc.front_text,
            fc.back_text,
            fc.front_media_url or "",
            fc.back_media_url or "",
            float(fc.ease_factor),
            fc.interval,
            fc.learning_state.value if fc.learning_state else "",
        ])

    csv_content = output.getvalue()
    output.close()

    logger.info(
        "deck_exported_csv",
        deck_id=deck_id,
        card_count=len(flashcards),
    )

    return csv_content


# ============================================================================
# Import
# ============================================================================


async def import_from_csv(
    user_id: int, deck_id: int, csv_content: str, db: AsyncSession
) -> Dict[str, Any]:
    """
    Import flashcards from CSV content into a deck.

    Expects columns: front_text, back_text (required),
    front_media_url, back_media_url (optional).

    Uses bulk_import for duplicate detection.

    Returns:
        Dict with imported, skipped_duplicates, errors, message.
    """
    from app.services.deck.generation import bulk_import

    await _get_user_deck(db, deck_id, user_id)

    reader = csv.DictReader(io.StringIO(csv_content))

    # Validate required columns
    if not reader.fieldnames or "front_text" not in reader.fieldnames:
        return {
            "imported": 0,
            "skipped_duplicates": 0,
            "errors": 1,
            "message": "CSV must have at least a 'front_text' column.",
        }

    cards = []
    for row in reader:
        front = row.get("front_text", "").strip()
        back = row.get("back_text", "").strip()
        if not front:
            continue  # Skip blank rows

        card = {"front_text": front, "back_text": back or front}
        if row.get("front_media_url"):
            card["front_media_url"] = row["front_media_url"]
        if row.get("back_media_url"):
            card["back_media_url"] = row["back_media_url"]
        cards.append(card)

    if not cards:
        return {
            "imported": 0,
            "skipped_duplicates": 0,
            "errors": 0,
            "message": "No valid rows found in CSV.",
        }

    result = await bulk_import(
        user_id=user_id, deck_id=deck_id, cards=cards, db=db
    )

    logger.info(
        "deck_imported_csv",
        deck_id=deck_id,
        imported=result.get("imported", 0),
    )

    return result


async def import_from_json(
    user_id: int, deck_id: int, json_data: Dict[str, Any], db: AsyncSession
) -> Dict[str, Any]:
    """
    Import flashcards from Synapse JSON export format.

    Accepts the format produced by export_deck_json().
    Falls back to plain card list if format header is missing.

    Returns:
        Dict with imported, skipped_duplicates, errors, message.
    """
    from app.services.deck.generation import bulk_import

    await _get_user_deck(db, deck_id, user_id)

    # Extract cards from synapse format or treat as raw list
    if isinstance(json_data, dict) and "cards" in json_data:
        raw_cards = json_data["cards"]
    elif isinstance(json_data, list):
        raw_cards = json_data
    else:
        return {
            "imported": 0,
            "skipped_duplicates": 0,
            "errors": 1,
            "message": "Invalid JSON format. Expected {cards: [...]} or [...].",
        }

    # Normalize card format (strip out stats, keep content fields)
    cards = []
    for raw in raw_cards:
        if not isinstance(raw, dict):
            continue
        front = raw.get("front_text", raw.get("front", "")).strip()
        back = raw.get("back_text", raw.get("back", "")).strip()
        if not front:
            continue

        card = {"front_text": front, "back_text": back or front}
        if raw.get("front_media_url"):
            card["front_media_url"] = raw["front_media_url"]
        if raw.get("back_media_url"):
            card["back_media_url"] = raw["back_media_url"]
        cards.append(card)

    if not cards:
        return {
            "imported": 0,
            "skipped_duplicates": 0,
            "errors": 0,
            "message": "No valid cards found in JSON data.",
        }

    result = await bulk_import(
        user_id=user_id, deck_id=deck_id, cards=cards, db=db
    )

    logger.info(
        "deck_imported_json",
        deck_id=deck_id,
        imported=result.get("imported", 0),
    )

    return result


# ============================================================================
# Internal Helpers
# ============================================================================


async def _get_user_deck(
    db: AsyncSession, deck_id: int, user_id: int
) -> Deck:
    """Get deck owned by user or raise ValueError."""
    result = await db.execute(
        select(Deck).where(
            and_(
                Deck.id == deck_id,
                Deck.user_id == user_id,
                Deck.deleted_at.is_(None),
            )
        )
    )
    deck = result.scalar_one_or_none()
    if not deck:
        raise ValueError(f"Deck {deck_id} not found or not owned by user")
    return deck
