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
from typing import List, Optional, TYPE_CHECKING

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
import structlog

from app.models.deck import Deck
from app.models.flashcard import Flashcard

if TYPE_CHECKING:
    from app.schemas.flashcards.card_design import CardDesignPlan

logger = structlog.get_logger(__name__)


def _fire_auto_categorise(deck_id: int, user_id: int) -> None:
    """
    Dispatch the auto-categorisation Celery task.

    Wrapped in a try/except so a Celery broker issue never crashes generation.
    """
    try:
        from app.services.background.learning_tasks import auto_categorise_deck
        auto_categorise_deck.delay(deck_id=deck_id, user_id=user_id)
    except Exception as exc:
        logger.warning(
            "auto_categorise_dispatch_failed",
            deck_id=deck_id,
            user_id=user_id,
            error=str(exc),
        )

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
    from app.models.document import Document, ProcessingStatus
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
    if document.processing_status != ProcessingStatus.COMPLETED:
        raise ValueError(
            f"Document is not ready for flashcard generation "
            f"(status: '{document.processing_status.value}'). "
            f"Wait until status is 'completed'."
        )
    if not document.content_text:
        raise ValueError("Document has no extractable text content")

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
      "front": "Question or term (question-form, e.g. 'What is the Visibility Map?')",
      "back": "Answer or definition",
      "topic": "Noun-phrase concept name (e.g. 'PostgreSQL Visibility Map'). Specific, not vague."
    }}
  ]
}}
"""
    result = await agent.execute(user_id=user_id, input=prompt, context={"document_id": document.id})
    if not result.success:
        raise ValueError(result.error)

    flashcards = _parse_flashcards_json(result.output)
    if not flashcards:
        raise ValueError("No flashcards could be parsed from AI response")

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

    cards_created = await _create_cards(service, user_id, deck["id"], flashcards, num_cards)
    await db.commit()

    # Wire knowledge graph
    await _wire_graph_link(
        db, user_id, "DECK", deck["id"], document.id,
        {"method": "ai", "source_filename": document.filename, "cards_generated": cards_created},
    )
    await db.commit()

    # Auto-categorise into a collection in the background
    _fire_auto_categorise(deck["id"], user_id)

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
      "front": "Question or term (question-form, e.g. 'What is MVCC?')",
      "back": "Answer or definition",
      "topic": "Noun-phrase concept name (e.g. 'PostgreSQL MVCC'). Must be specific, not vague."
    }}
  ]
}}
"""

    orchestrator = get_orchestrator()
    result = await orchestrator.handle_message(
        user_id=user_id, session_id=0, message=prompt, context={"intent": "flashcard_generation"},
    )
    if not result.success:
        raise ValueError(result.output or "AI generation failed")

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
    logger.info(
        "topic_deck_created_no_graph_edge",
        deck_id=deck["id"],
        topic=topic,
        user_id=user_id,
        reason="no_source_document",
    )

    # Auto-categorise into a collection in the background
    _fire_auto_categorise(deck["id"], user_id)

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
# Plan-Based Generation (AI Card Designer)
# ============================================================================

# Style-specific prompt instructions injected per subtopic block.
_STYLE_INSTRUCTIONS = {
    "basic": (
        "Write clear, direct Q/A flashcards. "
        "Front: question-form (e.g. 'What is X?' or 'How does X work?'). "
        "Back: concise answer. No filler."
    ),
    "cloze": (
        "Write fill-in-the-blank flashcards. "
        "Front: a sentence with the key term replaced by __ (double underscore). "
        "Back: the complete sentence with the answer filled in. "
        "Set cloze_answer to the exact word(s) that fill the blank."
    ),
    "socratic": (
        "Write reasoning-oriented flashcards that force the learner to THINK, not just recall. "
        "Front: 'What would happen if...', 'Why does...', 'Explain the mechanism of...', "
        "'Compare X and Y', 'What is the consequence of...'. "
        "NEVER write simple definition lookups. "
        "Back: a structured explanation, not a one-liner."
    ),
    "scenario": (
        "Write situation-based flashcards that test application of knowledge. "
        "Front: begins with 'You are...', 'A user asks...', 'Your application needs...', "
        "'Given that X is true, what do you do?'. "
        "Back: the correct action or response with brief rationale."
    ),
}


async def generate_from_plan(
    user_id: int,
    plan: "CardDesignPlan",
    db: AsyncSession,
) -> dict:
    """
    Generate flashcards from a CardDesignPlan produced by the AI designer.

    - If plan.deck_id is set, adds cards to that existing deck.
    - If plan.deck_id is None, creates a new deck named plan.deck_name.
    - Generates cards per subtopic using style-specific prompt instructions.
    - Cloze cards populate the cloze_answer field.
    - Returns the same dict shape as generate_from_topic for frontend consistency.
    """
    from app.modules.flashcards.service import FlashcardService

    service = FlashcardService(db)

    # ── 1. Resolve target deck (lazy creation) & dupe guard ─────────────────
    existing_fronts: set[str] = set()

    if plan.deck_id:
        deck = await _get_user_deck(db, plan.deck_id, user_id)
        deck_dict = {"id": deck.id, "name": deck.name}
        try:
            existing_res = await db.execute(
                select(Flashcard.front_text)
                .where(and_(Flashcard.deck_id == deck_dict["id"], Flashcard.deleted_at.is_(None)))
            )
            existing_fronts = {
                (row[0] or "").strip().lower() for row in existing_res.fetchall()
            }
        except Exception:
            pass
    else:
        deck_dict = None

    total_created = 0
    skipped_dupes = 0
    skipped_cloze_invalid = 0
    accumulated_cards = []

    # ── 3. Direct LiteLLM call for per-subtopic generation ───────────────────
    # IMPORTANT: We do NOT use the orchestrator here. The orchestrator would
    # re-classify the prompt as a "flashcard generation" intent and trigger
    # the full workflow (generate_from_topic) which creates a NEW deck per
    # subtopic — resulting in N decks instead of 1. We need raw JSON only.
    import litellm

    async def _call_llm_for_cards(prompt: str) -> str:
        """Call the cloud LLM directly to get flashcard JSON."""
        try:
            from app.core.ai.providers.litellm_router import get_llm_router
            router = get_llm_router()
            if router:
                response = await router.acompletion(
                    model="synapse-chat",
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.7,
                    max_tokens=4096,
                )
            else:
                # Fallback 1: call litellm directly with gemini flash
                response = await litellm.acompletion(
                    model="gemini/gemini-2.0-flash",
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.7,
                    max_tokens=4096,
                )
            return response.choices[0].message.content or ""
        except Exception as primary_e:
            logger.warning("subtopic_primary_llm_failed", error=str(primary_e))
            # Fallback 2: Local Ollama wrapper for Qwen Cloud
            import os
            try:
                ollama_base = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
                response = await litellm.acompletion(
                    model="ollama/qwen3-next:80b-cloud",
                    api_base=ollama_base,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.7,
                    max_tokens=4096,
                )
                return response.choices[0].message.content or ""
            except Exception as fallback_e:
                logger.warning("subtopic_fallback_llm_failed", error=str(fallback_e))
                raise fallback_e
    for spec in plan.subtopics:
        style_key = spec.style.value if hasattr(spec.style, "value") else str(spec.style)
        style_instr = _STYLE_INSTRUCTIONS.get(style_key, _STYLE_INSTRUCTIONS["basic"])
        is_cloze = style_key == "cloze"

        source_section = ""
        if plan.source_material:
            excerpt = plan.source_material[:6000]
            source_section = f"\nSource material (use this exclusively):\n{excerpt}\n"

        difficulty_hint = (
            f"\nDifficulty note: {spec.difficulty_note}" if spec.difficulty_note else ""
        )

        cloze_field = (
            '      "cloze_answer": "word(s) that fill the blank",'
            if is_cloze
            else ""
        )

        prompt = f"""Generate exactly {spec.count} flashcards about: {spec.topic}

Card style instructions:
{style_instr}{difficulty_hint}{source_section}

Return ONLY valid JSON:
{{
  "flashcards": [
    {{
      "front": "...",
      "back": "...",{cloze_field}
      "topic": "{spec.topic}"
    }}
  ]
}}"""

        try:
            llm_output = await _call_llm_for_cards(prompt)
        except Exception as e:
            logger.warning(
                "design_subtopic_generation_failed",
                topic=spec.topic,
                error=str(e),
            )
            continue

        raw_cards = _parse_flashcards_json(llm_output)

        # Create each card with correct type + cloze_answer
        for fc in raw_cards[: spec.count]:
            if "front" not in fc or "back" not in fc:
                continue

            # ── Dupe guard ───────────────────────────────────────────────
            front_norm = fc["front"].strip().lower()
            if front_norm in existing_fronts:
                skipped_dupes += 1
                logger.debug(
                    "design_card_duplicate_skipped",
                    front_preview=fc["front"][:60],
                    deck_id=deck_dict["id"],
                )
                continue
            existing_fronts.add(front_norm)

            # ── Cloze validator ─────────────────────────────────────────
            if is_cloze:
                has_blank = "__" in fc.get("front", "")
                has_answer = bool((fc.get("cloze_answer") or "").strip())
                if not has_blank or not has_answer:
                    skipped_cloze_invalid += 1
                    logger.warning(
                        "cloze_card_invalid_skipped",
                        has_blank=has_blank,
                        has_answer=has_answer,
                        front_preview=fc.get("front", "")[:60],
                    )
                    continue

            card_data = {
                "front_text": fc["front"],
                "back_text": fc["back"],
                "topic": fc.get("topic") or spec.topic,
                "card_type": style_key,
            }
            if is_cloze and fc.get("cloze_answer"):
                card_data["cloze_answer"] = fc["cloze_answer"]

            accumulated_cards.append(card_data)

    if not accumulated_cards and plan.deck_id is None:
        raise ValueError("Failed to generate any valid cards. Deck creation aborted.")

    # ── 4. Commit Phase (Create Deck & Cards) ────────────────────────────────
    if not deck_dict:
        deck_dict = await service.create_deck(
            user_id=user_id,
            data={
                "name": plan.deck_name,
                "description": f"AI-designed deck — {plan.learning_objective or 'mixed'}",
                "tags": ["ai-designed"],
                "is_public": False,
                "ai_generated": True,
                "ai_metadata": {
                    "source": "card_designer",
                    "learning_objective": plan.learning_objective,
                    "subtopics": [s.model_dump() for s in plan.subtopics],
                },
            },
        )

    for card_data in accumulated_cards:
        card_data["deck_id"] = deck_dict["id"]
        await service.create_card(user_id=user_id, data=card_data)
        total_created += 1

    await db.commit()

    logger.info(
        "flashcards_generated_from_plan",
        deck_id=deck_dict["id"],
        total_created=total_created,
        skipped_dupes=skipped_dupes,
        skipped_cloze_invalid=skipped_cloze_invalid,
        subtopics=len(plan.subtopics),
    )

    _fire_auto_categorise(deck_dict["id"], user_id)
    await _send_generation_notification(db, user_id, deck_dict["id"], total_created, plan.deck_name)

    return {
        "deck_id": deck_dict["id"],
        "deck_name": deck_dict["name"],
        "cards_generated": total_created,
        "status": "success",
        "message": f"AI Designer created {total_created} cards in \"{deck_dict['name']}\"",
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
                data={
                    "deck_id": deck_id,
                    "front_text": fc["front"],
                    "back_text": fc["back"],
                    # topic is the noun-phrase concept name for concept_mastery precision.
                    # Falls back gracefully if the AI didn't include it.
                    "topic": fc.get("topic") or None,
                },
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
        logger.error(
            "graph_linker_failed",
            error=str(e),
            exc_info=True,
            entity_type=entity_type_str,
            entity_id=entity_id,
            source_doc_id=source_doc_id,
            user_id=user_id,
        )


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
