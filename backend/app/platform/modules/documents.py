"""
Documents Module - Platform Registration.

Wires the Documents module into the platform layer.
"""

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.document import Document, ProcessingStatus
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

DOCUMENTS_CAPABILITIES = [
    EntityCapability.REFERENCE_IN_CHAT,
    EntityCapability.GENERATE_FLASHCARDS,
    EntityCapability.GENERATE_QUIZ,
    EntityCapability.SUMMARIZE,
    EntityCapability.EXPORT,
]


# ============================================================================
# Entity Search
# ============================================================================


async def search_documents(
    query: str,
    db: AsyncSession,
    user_id: int,
    limit: int = 10,
) -> list[EntitySearchResult]:
    """Search for documents by filename."""
    stmt = (
        select(Document)
        .where(Document.user_id == user_id, Document.filename.ilike(f"%{query}%"))
        .limit(limit)
    )
    result = await db.execute(stmt)
    docs = result.scalars().all()

    return [
        EntitySearchResult(
            id=doc.id,
            type=EntityType.DOCUMENT,
            source_module=ModuleId.DOCUMENTS,
            title=doc.filename,
            created_at=doc.created_at,
        )
        for doc in docs
    ]


# ============================================================================
# Entity Resolution
# ============================================================================


async def resolve_document(
    entity_id: int | str,
    db: AsyncSession,
    user_id: int,
) -> LearningEntity | None:
    """Resolve a document to a LearningEntity."""
    result = await db.execute(
        select(Document).where(Document.id == int(entity_id), Document.user_id == user_id)
    )
    doc = result.scalar_one_or_none()

    if not doc:
        return None

    # Resolve capabilities
    capabilities = []
    for cap in DOCUMENTS_CAPABILITIES:
        resolved = await check_document_availability(entity_id, cap, db, user_id)
        capabilities.append(resolved)

    return LearningEntity(
        id=doc.id,
        type=EntityType.DOCUMENT,
        source_module=ModuleId.DOCUMENTS,
        title=doc.filename,
        created_at=doc.created_at,
        capabilities=capabilities,
        visibility=EntityVisibility.PRIVATE,
        metadata={
            "filename": doc.filename,
            "file_type": doc.file_type,
            "file_size": doc.file_size,
            "processing_status": doc.processing_status.value if doc.processing_status else None,
            "page_count": doc.page_count,
            "word_count": doc.word_count,
        },
    )


# ============================================================================
# Capability Availability
# ============================================================================


async def check_document_availability(
    entity_id: int | str,
    capability: EntityCapability,
    db: AsyncSession,
    user_id: int,
) -> ResolvedCapability:
    """Check if a capability is available for a document."""
    result = await db.execute(
        select(Document).where(Document.id == int(entity_id), Document.user_id == user_id)
    )
    doc = result.scalar_one_or_none()

    if not doc:
        return ResolvedCapability(
            capability=capability, available=False, reason="Document not found"
        )

    # All capabilities require document to be processed
    if doc.processing_status != ProcessingStatus.COMPLETED:
        reason = (
            "Document is still being processed"
            if doc.processing_status == ProcessingStatus.PROCESSING
            else "Document is not ready"
        )
        return ResolvedCapability(capability=capability, available=False, reason=reason)

    # Check specific capability requirements
    if capability in [EntityCapability.GENERATE_FLASHCARDS, EntityCapability.GENERATE_QUIZ]:
        if not doc.page_count or doc.page_count < 1:
            return ResolvedCapability(
                capability=capability,
                available=False,
                reason="Document has no content to generate from",
            )

    if capability == EntityCapability.SUMMARIZE:
        if not doc.page_count or doc.page_count < 1:
            return ResolvedCapability(
                capability=capability,
                available=False,
                reason="Document has no content to summarize",
            )

    return ResolvedCapability(capability=capability, available=True)


# ============================================================================
# Capability Execution
# ============================================================================


async def execute_document_capability(
    capability: EntityCapability,
    entity: LearningEntity,
    db: AsyncSession,
    user_id: int,
    options: dict[str, Any] | None = None,
) -> PlatformActionResult:
    """Execute a capability on a document."""
    match capability:
        case EntityCapability.REFERENCE_IN_CHAT:
            return PlatformActionResult(
                status=ActionStatus.SUCCESS,
                message="Document ready to reference in chat",
            )

        case EntityCapability.GENERATE_FLASHCARDS:
            # TODO: Call flashcard generation service
            return PlatformActionResult(
                status=ActionStatus.SUCCESS,
                message="Flashcard generation from document started",
            )

        case EntityCapability.GENERATE_QUIZ:
            # TODO: Call quiz generation service
            return PlatformActionResult(
                status=ActionStatus.SUCCESS,
                message="Quiz generation from document started",
            )

        case EntityCapability.SUMMARIZE:
            # TODO: Call summarization service
            return PlatformActionResult(
                status=ActionStatus.SUCCESS,
                message="Document summary generation started",
            )

        case EntityCapability.EXPORT:
            return PlatformActionResult(
                status=ActionStatus.SUCCESS,
                message="Document export started",
            )

        case _:
            return PlatformActionResult(
                status=ActionStatus.ERROR,
                message=f"Documents module does not support {capability}",
            )


# ============================================================================
# Module Contract
# ============================================================================

documents_module_contract = ModuleContract(
    id=ModuleId.DOCUMENTS,
    name="Documents",
    entity_types=[EntityType.DOCUMENT],
    resolve_entity=resolve_document,
    execute_capability=execute_document_capability,
    check_availability=check_document_availability,
    search_entities=search_documents,
    supported_capabilities=DOCUMENTS_CAPABILITIES,
)


def init_documents_module() -> None:
    """Initialize Documents module with the platform."""
    register_module(documents_module_contract)
