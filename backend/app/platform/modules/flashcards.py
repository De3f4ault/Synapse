"""
Flashcards Module - Platform Registration.

Wires the Flashcards module into the platform layer.
"""

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.flashcard import Flashcard
from app.schemas.platform import (
    EntityType,
    EntityCapability,
    ModuleId,
    LearningEntity,
    ResolvedCapability,
    EntityVisibility,
    PlatformActionResult,
    ActionStatus,
    EntitySearchResult,
)
from app.platform.registry import ModuleContract, register_module
from app.models.deck import Deck


# ============================================================================
# Supported Capabilities
# ============================================================================

FLASHCARDS_CAPABILITIES = [
    EntityCapability.REFERENCE_IN_CHAT,
    EntityCapability.REINFORCE_GRAPH,
]


# ============================================================================
# Entity Search
# ============================================================================


async def search_flashcards(
    query: str,
    db: AsyncSession,
    user_id: int,
    limit: int = 10,
) -> list[EntitySearchResult]:
    """
    Search for flashcard DECKS by name.

    The user's mental model when mentioning flashcards is:
      @PostgreSQL Internals  → the whole deck, not a single card.

    We search Deck.name so the picker surfaces deck-level results.
    The entity ID returned is the DECK id (not a card id).
    EntityType.FLASHCARD is kept to avoid a schema change — the
    hydrator handles the deck-level hydration.
    """
    stmt = (
        select(Deck)
        .where(
            Deck.user_id == user_id,
            Deck.name.ilike(f"%{query}%"),
            Deck.deleted_at.is_(None),
        )
        .order_by(Deck.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    decks = result.scalars().all()

    return [
        EntitySearchResult(
            id=deck.id,
            type=EntityType.FLASHCARD,
            source_module=ModuleId.FLASHCARDS,
            title=deck.name,
            created_at=deck.created_at,
            match_preview=deck.description[:100] if deck.description else None,
        )
        for deck in decks
    ]


# ============================================================================
# Entity Resolution
# ============================================================================


async def resolve_flashcard(
    entity_id: int | str,
    db: AsyncSession,
    user_id: int,
) -> LearningEntity | None:
    """
    Resolve a flashcard DECK to a LearningEntity.

    entity_id is a DECK id (as returned by search_flashcards).
    SECURITY: Enforces user_id ownership on the Deck row.
    """
    from sqlalchemy import func

    result = await db.execute(
        select(Deck).where(
            Deck.id == int(entity_id),
            Deck.user_id == user_id,
            Deck.deleted_at.is_(None),
        )
    )
    deck = result.scalar_one_or_none()

    if not deck:
        return None

    capabilities = []
    for cap in FLASHCARDS_CAPABILITIES:
        resolved = await check_flashcard_availability(entity_id, cap, db, user_id)
        capabilities.append(resolved)

    # Count active cards without eager-loading the full relationship
    count_result = await db.execute(
        select(func.count(Flashcard.id)).where(
            Flashcard.deck_id == deck.id,
            Flashcard.deleted_at.is_(None),
        )
    )
    card_count = count_result.scalar_one() or 0

    return LearningEntity(
        id=deck.id,
        type=EntityType.FLASHCARD,
        source_module=ModuleId.FLASHCARDS,
        title=deck.name,
        created_at=deck.created_at,
        capabilities=capabilities,
        visibility=EntityVisibility.PRIVATE,
        metadata={
            "deck_id": deck.id,
            "deck_name": deck.name,
            "description": deck.description,
            "card_count": card_count,
            "ai_generated": deck.ai_generated,
        },
    )


# ============================================================================
# Capability Availability
# ============================================================================


async def check_flashcard_availability(
    entity_id: int | str,
    capability: EntityCapability,
    db: AsyncSession,
    user_id: int,
) -> ResolvedCapability:
    """
    Check if a capability is available for a flashcard DECK.

    entity_id is a DECK id.
    SECURITY: Enforces user_id ownership on the Deck row.
    """
    result = await db.execute(
        select(Deck).where(
            Deck.id == int(entity_id),
            Deck.user_id == user_id,
            Deck.deleted_at.is_(None),
        )
    )
    deck = result.scalar_one_or_none()

    if not deck:
        return ResolvedCapability(
            capability=capability, available=False, reason="Deck not found"
        )

    return ResolvedCapability(capability=capability, available=True)


# ============================================================================
# Capability Execution
# ============================================================================


async def execute_flashcard_capability(
    capability: EntityCapability,
    entity: LearningEntity,
    db: AsyncSession,
    user_id: int,
    options: dict[str, Any] | None = None,
) -> PlatformActionResult:
    """Execute a capability on a flashcard."""
    match capability:
        case EntityCapability.REINFORCE_GRAPH:
            return PlatformActionResult(
                status=ActionStatus.SUCCESS,
                message="Flashcard reinforced in knowledge graph",
            )

        case _:
            return PlatformActionResult(
                status=ActionStatus.ERROR,
                message=f"Flashcards module does not support {capability}",
            )


# ============================================================================
# Module Contract
# ============================================================================

flashcards_module_contract = ModuleContract(
    id=ModuleId.FLASHCARDS,
    name="Flashcards",
    entity_types=[EntityType.FLASHCARD],
    resolve_entity=resolve_flashcard,
    execute_capability=execute_flashcard_capability,
    check_availability=check_flashcard_availability,
    search_entities=search_flashcards,
    supported_capabilities=FLASHCARDS_CAPABILITIES,
)


def init_flashcards_module() -> None:
    """Initialize Flashcards module with the platform."""
    register_module(flashcards_module_contract)
