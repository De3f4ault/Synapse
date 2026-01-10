"""
Platform Graph API.

Provides graph relation and intelligence endpoints.

Endpoints:
  GET /graph/relations/{type}/{id} - Get related entities
  GET /graph/context/{type}/{id} - Get graph intelligence context
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.platform import (
    EntityType,
    EntityIdentity,
    EntityRelation,
    GraphContext,
    PlatformAction,
    EntityCapability,
    ModuleId,
)

router = APIRouter()


# ============================================================================
# Relations
# ============================================================================


@router.get(
    "/relations/{entity_type}/{entity_id}",
    response_model=list[EntityRelation],
    summary="Get Relations",
    description="Get all entities related to the specified entity.",
)
async def get_entity_relations(
    entity_type: EntityType,
    entity_id: int,
    relation_type: str | None = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[EntityRelation]:
    """
    Get all entities related to the specified entity.

    This queries the knowledge graph for edges connected to this entity.
    """
    # For now, return empty list - will be populated when graph is wired
    # TODO: Query graph edges and return related entities
    return []


# ============================================================================
# Graph Intelligence
# ============================================================================


@router.get(
    "/context/{entity_type}/{entity_id}",
    response_model=GraphContext,
    summary="Get Graph Context",
    description="Get graph intelligence for an entity (weaknesses, strengths, recommendations).",
)
async def get_graph_context(
    entity_type: EntityType,
    entity_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GraphContext:
    """
    Get graph intelligence context for an entity.

    This includes:
    - Weak concepts related to this entity
    - Strong concepts (mastery)
    - Recommended platform actions
    """
    from sqlalchemy import text

    # Query GIE for user's weak/strong concepts
    result = await db.execute(
        text("SELECT * FROM developer_schema.get_intelligence_summary(:user_id, :limit)"),
        {"user_id": current_user.id, "limit": 5},
    )
    rows = result.fetchall()

    weaknesses: list[str] = []
    strengths: list[str] = []

    for row in rows:
        if row.category == "weak":
            weaknesses.append(str(row.concept_id))
        elif row.mastery and row.mastery >= 0.7:
            strengths.append(str(row.concept_id))

    # Build recommended actions based on entity type AND intelligence
    recommended_actions: list[PlatformAction] = []

    target = EntityIdentity(
        id=entity_id,
        type=entity_type,
        source_module=_get_module_for_type(entity_type),
    )

    # Documents can generate flashcards and quizzes
    if entity_type == EntityType.DOCUMENT:
        recommended_actions.append(
            PlatformAction(
                type=EntityCapability.GENERATE_FLASHCARDS,
                target=target,
                reason="Create flashcards from document content",
                priority=70,
            )
        )
        recommended_actions.append(
            PlatformAction(
                type=EntityCapability.GENERATE_QUIZ,
                target=target,
                reason="Test your understanding with a quiz",
                priority=60,
            )
        )

    # Notes can generate flashcards
    elif entity_type == EntityType.NOTE:
        recommended_actions.append(
            PlatformAction(
                type=EntityCapability.GENERATE_FLASHCARDS,
                target=target,
                reason="Turn this note into flashcards",
                priority=65,
            )
        )

    return GraphContext(
        weaknesses=weaknesses,
        strengths=strengths,
        recommended_actions=recommended_actions,
    )


def _get_module_for_type(entity_type: EntityType) -> ModuleId:
    """Map entity type to module ID."""
    mapping = {
        EntityType.DOCUMENT: ModuleId.DOCUMENTS,
        EntityType.NOTE: ModuleId.NOTES,
        EntityType.FLASHCARD: ModuleId.FLASHCARDS,
        EntityType.QUIZ: ModuleId.QUIZZES,
        EntityType.CONCEPT: ModuleId.GRAPH,
    }
    return mapping.get(entity_type, ModuleId.NOTES)
