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
    """Search for flashcards by front text."""
    stmt = (
        select(Flashcard)
        .join(Deck)
        .where(Deck.user_id == user_id, Flashcard.front_text.ilike(f"%{query}%"))
        .limit(limit)
    )
    result = await db.execute(stmt)
    cards = result.scalars().all()

    return [
        EntitySearchResult(
            id=card.id,
            type=EntityType.FLASHCARD,
            source_module=ModuleId.FLASHCARDS,
            title=card.front_text[:50] + ("..." if len(card.front_text) > 50 else ""),
            created_at=card.created_at,
        )
        for card in cards
    ]


# ============================================================================
# Entity Resolution
# ============================================================================


async def resolve_flashcard(
    entity_id: int | str,
    db: AsyncSession,
    user_id: int,
) -> LearningEntity | None:
    """Resolve a flashcard to a LearningEntity."""
    result = await db.execute(select(Flashcard).where(Flashcard.id == int(entity_id)))
    card = result.scalar_one_or_none()

    if not card:
        return None

    # Resolve capabilities
    capabilities = []
    for cap in FLASHCARDS_CAPABILITIES:
        resolved = await check_flashcard_availability(entity_id, cap, db, user_id)
        capabilities.append(resolved)

    # Create title from front text
    title = card.front_text[:50] + ("..." if len(card.front_text) > 50 else "")

    return LearningEntity(
        id=card.id,
        type=EntityType.FLASHCARD,
        source_module=ModuleId.FLASHCARDS,
        title=title,
        created_at=card.created_at,
        capabilities=capabilities,
        visibility=EntityVisibility.PRIVATE,
        metadata={
            "front_text": card.front_text,
            "back_text": card.back_text,
            "deck_id": card.deck_id,
            "ease_factor": card.ease_factor,
            "interval": card.interval,
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
    """Check if a capability is available for a flashcard."""
    result = await db.execute(select(Flashcard).where(Flashcard.id == int(entity_id)))
    card = result.scalar_one_or_none()

    if not card:
        return ResolvedCapability(
            capability=capability, available=False, reason="Flashcard not found"
        )

    # Flashcards primarily support REINFORCE_GRAPH
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
