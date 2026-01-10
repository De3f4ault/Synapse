"""
Notes Module - Platform Registration.

Wires the Notes module into the platform layer.
"""

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.note import Note
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


# ============================================================================
# Supported Capabilities
# ============================================================================

NOTES_CAPABILITIES = [
    EntityCapability.REFERENCE_IN_CHAT,
    EntityCapability.GENERATE_FLASHCARDS,
    EntityCapability.GENERATE_QUIZ,
    EntityCapability.REINFORCE_GRAPH,
    EntityCapability.SUMMARIZE,
]


# ============================================================================
# Entity Search
# ============================================================================


async def search_notes(
    query: str,
    db: AsyncSession,
    user_id: int,
    limit: int = 10,
) -> list[EntitySearchResult]:
    """Search for notes by title."""
    stmt = select(Note).where(Note.user_id == user_id, Note.title.ilike(f"%{query}%")).limit(limit)
    result = await db.execute(stmt)
    notes = result.scalars().all()

    return [
        EntitySearchResult(
            id=note.id,
            type=EntityType.NOTE,
            source_module=ModuleId.NOTES,
            title=note.title,
            created_at=note.created_at,
        )
        for note in notes
    ]


# ============================================================================
# Entity Resolution
# ============================================================================


async def resolve_note(
    entity_id: int | str,
    db: AsyncSession,
    user_id: int,
) -> LearningEntity | None:
    """Resolve a note to a LearningEntity."""
    result = await db.execute(
        select(Note).where(Note.id == int(entity_id), Note.user_id == user_id)
    )
    note = result.scalar_one_or_none()

    if not note:
        return None

    # Resolve capabilities
    capabilities = []
    for cap in NOTES_CAPABILITIES:
        resolved = await check_note_availability(entity_id, cap, db, user_id)
        capabilities.append(resolved)

    return LearningEntity(
        id=note.id,
        type=EntityType.NOTE,
        source_module=ModuleId.NOTES,
        title=note.title,
        created_at=note.created_at,
        capabilities=capabilities,
        visibility=EntityVisibility.PRIVATE,
        metadata={
            "content_length": len(note.content) if note.content else 0,
            "format": note.format.value if note.format else "markdown",
            "parent_id": note.parent_id,
        },
    )


# ============================================================================
# Capability Availability
# ============================================================================


async def check_note_availability(
    entity_id: int | str,
    capability: EntityCapability,
    db: AsyncSession,
    user_id: int,
) -> ResolvedCapability:
    """Check if a capability is available for a note."""
    result = await db.execute(
        select(Note).where(Note.id == int(entity_id), Note.user_id == user_id)
    )
    note = result.scalar_one_or_none()

    if not note:
        return ResolvedCapability(capability=capability, available=False, reason="Note not found")

    content_length = len(note.content) if note.content else 0

    # Check specific capability requirements
    if capability in [EntityCapability.GENERATE_FLASHCARDS, EntityCapability.GENERATE_QUIZ]:
        if content_length < 100:
            return ResolvedCapability(
                capability=capability,
                available=False,
                reason="Note is too short (minimum 100 characters)",
            )

    if capability == EntityCapability.SUMMARIZE:
        if content_length < 200:
            return ResolvedCapability(
                capability=capability,
                available=False,
                reason="Note is too short to summarize",
            )

    return ResolvedCapability(capability=capability, available=True)


# ============================================================================
# Capability Execution
# ============================================================================


async def execute_note_capability(
    capability: EntityCapability,
    entity: LearningEntity,
    db: AsyncSession,
    user_id: int,
    options: dict[str, Any] | None = None,
) -> PlatformActionResult:
    """Execute a capability on a note."""
    match capability:
        case EntityCapability.REFERENCE_IN_CHAT:
            return PlatformActionResult(
                status=ActionStatus.SUCCESS,
                message="Note ready to reference in chat",
            )

        case EntityCapability.GENERATE_FLASHCARDS:
            # TODO: Call flashcard generation service
            return PlatformActionResult(
                status=ActionStatus.SUCCESS,
                message="Flashcard generation started",
            )

        case EntityCapability.GENERATE_QUIZ:
            # TODO: Call quiz generation service
            return PlatformActionResult(
                status=ActionStatus.SUCCESS,
                message="Quiz generation started",
            )

        case EntityCapability.REINFORCE_GRAPH:
            return PlatformActionResult(
                status=ActionStatus.SUCCESS,
                message="Graph reinforced",
            )

        case EntityCapability.SUMMARIZE:
            # TODO: Call summarization service
            return PlatformActionResult(
                status=ActionStatus.SUCCESS,
                message="Summary generation started",
            )

        case _:
            return PlatformActionResult(
                status=ActionStatus.ERROR,
                message=f"Notes module does not support {capability}",
            )


# ============================================================================
# Module Contract
# ============================================================================

notes_module_contract = ModuleContract(
    id=ModuleId.NOTES,
    name="Notes",
    entity_types=[EntityType.NOTE],
    resolve_entity=resolve_note,
    execute_capability=execute_note_capability,
    check_availability=check_note_availability,
    search_entities=search_notes,
    supported_capabilities=NOTES_CAPABILITIES,
)


def init_notes_module() -> None:
    """Initialize Notes module with the platform."""
    register_module(notes_module_contract)
