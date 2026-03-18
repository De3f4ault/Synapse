"""
Deck generation service — AI flashcard generation + bulk import.

Extracted from rest/decks.py — handles:
- Document-based flashcard generation (AI agent)
- Topic-based flashcard generation (orchestrator)
- Bulk import with duplicate detection
- Knowledge graph wiring
"""

import json
import re
from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
import structlog

from app.models.deck import Deck
from app.models.flashcard import Flashcard

logger = structlog.get_logger(__name__)


# ============================================================================
# Document-Based Generation
# ============================================================================


async def generate_from_document(
    user_id: int,
    document_id: int,
    deck_name: str,
    num_cards: int,
    difficulty: str,
    tags: Optional[List[str]],
    db: AsyncSession,
) -> dict:
    """
    Generate flashcards from a document using AI.

    Returns dict with deck_id, deck_name, cards_generated, status, message.
    """
    from app.models.document import Document
    from app.core.ai.agents.factory import create_agent
    from app.modules.flashcards.service import FlashcardService

    # Verify document ownership and processing state
    doc_result = await db.execute(
        select(Document).where(
            and_(Document.id == document_id, Document.user_id == user_id, Document.deleted_at.is_(None))
        )
    )
    document = doc_result.scalar_one_or_none()
    if not document:
        raise ValueError("Document not found")
    if document.processing_status != "completed":
        raise ValueError(f"Document processing status is '{document.processing_status}'. Must be 'completed'.")
    if not document.content_text:
        raise ValueError("Document has no extractable text content")

    service = FlashcardService(db)
    deck = await service.create_deck(
        user_id=user_id,
        data={
            "name": deck_name,
            "description": f"AI-generated flashcards from {document.filename}",
            "tags": tags or ["ai-generated"],
            "is_public": False,
            "ai_generated": True,
            "ai_metadata": {
                "source_document_id": document.id,
                "generation_params": {"num_cards": num_cards, "difficulty": difficulty},
            },
        },
    )

    agent = await create_agent("document")
    prompt = f"""
Generate {num_cards} high-quality flashcards from this document.

Difficulty: {difficulty}

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
    result = await agent.execute(user_id=user_id, input=prompt, context={"document_id": document.id})
    if not result.success:
        raise ValueError(result.error)

    flashcards = _parse_flashcards_json(result.output)
    cards_created = await _create_cards(service, user_id, deck["id"], flashcards, num_cards)
    await db.commit()

    # Wire knowledge graph
    await _wire_graph_link(
        db, user_id, "DECK", deck["id"], document.id,
        {"method": "ai", "source_filename": document.filename, "cards_generated": cards_created},
    )

    return {
        "deck_id": deck["id"],
        "deck_name": deck["name"],
        "cards_generated": cards_created,
        "status": "success",
        "message": f"Successfully generated {cards_created} flashcards",
    }


# ============================================================================
# Topic-Based Generation
# ============================================================================


async def generate_from_topic(
    user_id: int,
    topic: str,
    num_cards: int,
    difficulty: str,
    deck_name: Optional[str],
    tags: Optional[List[str]],
    db: AsyncSession,
) -> dict:
    """
    Generate flashcards from a topic using AI (orchestrator).

    Returns dict with deck_id, deck_name, cards_generated, status, message.
    """
    from app.core.ai.orchestrator import get_orchestrator
    from app.modules.flashcards.service import FlashcardService

    difficulty_desc = {
        "easy": "simple, beginner-level concepts",
        "medium": "intermediate, moderate complexity",
        "hard": "challenging, advanced concepts",
    }

    prompt = f"""Generate flashcards about: {topic}

Requirements:
- Generate exactly {num_cards} high-quality flashcards
- Difficulty: {difficulty_desc.get(difficulty, "intermediate")}
- Each flashcard should have a clear question/term on front and answer/definition on back
- Cover key concepts comprehensively

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

    orchestrator = get_orchestrator()
    result = await orchestrator.handle_message(
        user_id=user_id, session_id=0, message=prompt, context={"intent": "flashcard_generation"},
    )
    if not result.success:
        raise ValueError(result.error or "AI generation failed")

    flashcards = _parse_flashcards_json(result.output)
    if not flashcards:
        raise ValueError("No flashcards in response")

    service = FlashcardService(db)
    final_name = deck_name or f"Flashcards: {topic}"
    deck = await service.create_deck(
        user_id=user_id,
        data={
            "name": final_name,
            "description": f"AI-generated flashcards about {topic}",
            "tags": tags or ["ai-generated", topic.lower().replace(" ", "-")[:30]],
            "is_public": False,
            "ai_generated": True,
            "ai_metadata": {
                "source_topic": topic,
                "generation_params": {"num_cards": num_cards, "difficulty": difficulty},
            },
        },
    )

    cards_created = await _create_cards(service, user_id, deck["id"], flashcards, num_cards)
    await db.commit()

    logger.info("flashcards_generated_from_topic", topic=topic, deck_id=deck["id"], cards_created=cards_created)

    # Notification
    await _send_generation_notification(db, user_id, deck["id"], cards_created, topic)

    return {
        "deck_id": deck["id"],
        "deck_name": deck["name"],
        "cards_generated": cards_created,
        "status": "success",
        "message": f"Successfully generated {cards_created} flashcards about {topic}",
    }


# ============================================================================
# Bulk Import
# ============================================================================


async def bulk_import(
    user_id: int,
    deck_id: int,
    cards: list,
    db: AsyncSession,
) -> dict:
    """
    Bulk import flashcards with duplicate detection.

    Returns dict with imported, skipped_duplicates, errors, message.
    """
    deck = await _get_user_deck(db, deck_id, user_id)

    existing_result = await db.execute(
        select(func.lower(Flashcard.front_text)).where(
            and_(Flashcard.deck_id == deck.id, Flashcard.deleted_at.is_(None))
        )
    )
    existing_fronts = {row[0].strip() for row in existing_result.fetchall()}

    errors = []
    skipped = 0
    flashcards = []

    for i, card in enumerate(cards):
        try:
            front_norm = card.front.strip().lower()
            if front_norm in existing_fronts:
                skipped += 1
                continue
            existing_fronts.add(front_norm)
            flashcards.append(Flashcard(
                deck_id=deck.id, user_id=user_id,
                front_text=card.front.strip(), back_text=card.back.strip(),
            ))
        except Exception as e:
            errors.append(f"Card {i + 1}: {e}")

    if flashcards:
        db.add_all(flashcards)
        await db.commit()

    parts = [f"Successfully imported {len(flashcards)} flashcards"]
    if skipped:
        parts.append(f"{skipped} duplicates skipped")
    if errors:
        parts.append(f"{len(errors)} errors")

    return {"imported": len(flashcards), "skipped_duplicates": skipped, "errors": errors, "message": " | ".join(parts)}


# ============================================================================
# Internal Helpers
# ============================================================================


def _parse_flashcards_json(text: str) -> list:
    """Extract flashcards array from AI response."""
    # Try markdown code block
    json_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if json_match:
        data = json.loads(json_match.group(1))
        return data.get("flashcards", [])

    # Try raw JSON with "flashcards" key
    json_match = re.search(r'\{[\s\S]*"flashcards"[\s\S]*\}', text)
    if json_match:
        data = json.loads(json_match.group())
        return data.get("flashcards", [])

    raise ValueError("Could not parse flashcards JSON from response")


async def _create_cards(service, user_id: int, deck_id: int, flashcards: list, limit: int) -> int:
    """Create flashcard records from parsed list."""
    count = 0
    for fc in flashcards[:limit]:
        if "front" in fc and "back" in fc:
            await service.create_card(
                user_id=user_id,
                data={"deck_id": deck_id, "front_text": fc["front"], "back_text": fc["back"]},
            )
            count += 1
    return count


async def _get_user_deck(db: AsyncSession, deck_id: int, user_id: int) -> Deck:
    """Get deck owned by user or raise."""
    result = await db.execute(
        select(Deck).where(and_(Deck.id == deck_id, Deck.user_id == user_id, Deck.deleted_at.is_(None)))
    )
    deck = result.scalar_one_or_none()
    if not deck:
        raise ValueError("Deck not found")
    return deck


async def _wire_graph_link(db, user_id, entity_type_str, entity_id, source_doc_id, metadata):
    """Wire knowledge graph: Document → Deck/Entity (DERIVED)."""
    try:
        from app.services.graph.linker import GraphLinker
        from app.models.link import LinkEntityType as LET, LinkType as LT

        linker = GraphLinker(db)
        etype = getattr(LET, entity_type_str)
        await linker.on_entity_created(
            user_id=user_id, entity_type=etype, entity_id=entity_id,
            source_refs=[(LET.DOCUMENT, source_doc_id)],
            link_type=LT.DERIVED, label="generated from", metadata=metadata,
        )
    except Exception as e:
        logger.warning("graph_linker_failed", error=str(e), entity_id=entity_id)


async def _send_generation_notification(db, user_id, deck_id, cards_created, topic):
    """Send notification after flashcard generation."""
    try:
        from app.services.notification.service import NotificationService
        from app.models.notification import NotificationType, NotificationCategory

        svc = NotificationService(db)
        await svc.send(
            user_id=user_id,
            type=NotificationType.SUCCESS,
            category=NotificationCategory.LEARNING,
            title="Flashcards Generated",
            message=f"{cards_created} flashcards about '{topic}' are ready for review.",
            action_url=f"/decks/{deck_id}",
            action_label="Review Now",
            meta_data={"deck_id": deck_id, "cards_created": cards_created},
        )
    except Exception as e:
        logger.warning("notification_send_failed", error=str(e))
