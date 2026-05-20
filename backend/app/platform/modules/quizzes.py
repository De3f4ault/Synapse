"""
Quizzes Module - Platform Registration.

Wires the Quizzes module into the platform layer.
"""

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.quiz import Quiz
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

QUIZZES_CAPABILITIES = [
    EntityCapability.REFERENCE_IN_CHAT,
    EntityCapability.REINFORCE_GRAPH,
    EntityCapability.SUMMARIZE,
]


# ============================================================================
# Entity Search
# ============================================================================


async def search_quizzes(
    query: str,
    db: AsyncSession,
    user_id: int,
    limit: int = 10,
) -> list[EntitySearchResult]:
    """Search for quizzes by title."""
    stmt = select(Quiz).where(Quiz.user_id == user_id, Quiz.title.ilike(f"%{query}%")).limit(limit)
    result = await db.execute(stmt)
    quizzes = result.scalars().all()

    return [
        EntitySearchResult(
            id=quiz.id,
            type=EntityType.QUIZ,
            source_module=ModuleId.QUIZZES,
            title=quiz.title,
            created_at=quiz.created_at,
            match_preview=quiz.description[:120] if quiz.description else None,
        )
        for quiz in quizzes
    ]


# ============================================================================
# Entity Resolution
# ============================================================================


async def resolve_quiz(
    entity_id: int | str,
    db: AsyncSession,
    user_id: int,
) -> LearningEntity | None:
    """Resolve a quiz to a LearningEntity."""
    result = await db.execute(
        select(Quiz).where(Quiz.id == int(entity_id), Quiz.user_id == user_id)
    )
    quiz = result.scalar_one_or_none()

    if not quiz:
        return None

    # Resolve capabilities
    capabilities = []
    for cap in QUIZZES_CAPABILITIES:
        resolved = await check_quiz_availability(entity_id, cap, db, user_id)
        capabilities.append(resolved)

    return LearningEntity(
        id=quiz.id,
        type=EntityType.QUIZ,
        source_module=ModuleId.QUIZZES,
        title=quiz.title,
        created_at=quiz.created_at,
        capabilities=capabilities,
        visibility=EntityVisibility.PRIVATE,
        metadata={
            "description": quiz.description,
            "difficulty": quiz.difficulty.value if quiz.difficulty else None,
            "time_limit_minutes": quiz.time_limit_minutes,
            "question_count": len(quiz.questions) if quiz.questions else 0,
        },
    )


# ============================================================================
# Capability Availability
# ============================================================================


async def check_quiz_availability(
    entity_id: int | str,
    capability: EntityCapability,
    db: AsyncSession,
    user_id: int,
) -> ResolvedCapability:
    """Check if a capability is available for a quiz."""
    result = await db.execute(
        select(Quiz).where(Quiz.id == int(entity_id), Quiz.user_id == user_id)
    )
    quiz = result.scalar_one_or_none()

    if not quiz:
        return ResolvedCapability(capability=capability, available=False, reason="Quiz not found")

    # Check specific requirements
    if capability == EntityCapability.REINFORCE_GRAPH:
        question_count = len(quiz.questions) if quiz.questions else 0
        if question_count < 1:
            return ResolvedCapability(
                capability=capability,
                available=False,
                reason="Quiz has no questions",
            )

    if capability == EntityCapability.REFERENCE_IN_CHAT:
        question_count = len(quiz.questions) if quiz.questions else 0
        if question_count < 1:
            return ResolvedCapability(
                capability=capability,
                available=False,
                reason="Quiz has no questions to reference",
            )

    return ResolvedCapability(capability=capability, available=True)


# ============================================================================
# Capability Execution
# ============================================================================


async def execute_quiz_capability(
    capability: EntityCapability,
    entity: LearningEntity,
    db: AsyncSession,
    user_id: int,
    options: dict[str, Any] | None = None,
) -> PlatformActionResult:
    """Execute a capability on a quiz."""
    match capability:
        case EntityCapability.REFERENCE_IN_CHAT:
            return PlatformActionResult(
                status=ActionStatus.SUCCESS,
                message="Quiz ready to reference in chat",
            )

        case EntityCapability.REINFORCE_GRAPH:
            return PlatformActionResult(
                status=ActionStatus.SUCCESS,
                message="Quiz results reinforced in knowledge graph",
            )

        case EntityCapability.SUMMARIZE:
            return PlatformActionResult(
                status=ActionStatus.SUCCESS,
                message="Quiz summary generation started",
            )

        case _:
            return PlatformActionResult(
                status=ActionStatus.ERROR,
                message=f"Quizzes module does not support {capability}",
            )


# ============================================================================
# Module Contract
# ============================================================================

quizzes_module_contract = ModuleContract(
    id=ModuleId.QUIZZES,
    name="Quizzes",
    entity_types=[EntityType.QUIZ],
    resolve_entity=resolve_quiz,
    execute_capability=execute_quiz_capability,
    check_availability=check_quiz_availability,
    search_entities=search_quizzes,
    supported_capabilities=QUIZZES_CAPABILITIES,
)


def init_quizzes_module() -> None:
    """Initialize Quizzes module with the platform."""
    register_module(quizzes_module_contract)
