"""
Platform Graph API.

Provides graph relation, intelligence, and analytics endpoints.

Endpoints:
  GET /graph/relations/{type}/{id} - Get related entities
  GET /graph/context/{type}/{id} - Get graph intelligence context
  GET /graph/analytics - Full graph analytics dashboard
  GET /graph/analytics/hubs - Most connected entities
  POST /graph/refresh - Trigger semantic link refresh
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
# Graph Analytics
# ============================================================================


@router.get(
    "/analytics",
    summary="Graph Analytics Dashboard",
    description="Get aggregate knowledge graph metrics: stats, hubs, orphans, clusters, distribution, growth.",
)
async def get_graph_analytics(
    days: int = 30,
    hub_limit: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Full graph analytics dashboard.

    Returns aggregate metrics about the user's knowledge graph
    including density, hub detection, orphan nodes, clusters,
    link type distribution, and growth trends.
    """
    from app.services.graph.analytics import GraphAnalytics

    analytics = GraphAnalytics(db)

    stats = await analytics.get_graph_stats(current_user.id)
    distribution = await analytics.get_link_type_distribution(current_user.id)
    clusters = await analytics.get_cluster_summary(current_user.id)
    orphans = await analytics.get_orphan_nodes(current_user.id)
    growth = await analytics.get_growth_trend(current_user.id, days=days)
    hubs = await analytics.get_most_connected(current_user.id, limit=hub_limit)

    return {
        "stats": stats,
        "hubs": hubs,
        "orphans": orphans,
        "clusters": clusters,
        "link_type_distribution": distribution,
        "growth_trend": growth,
    }


@router.get(
    "/analytics/hubs",
    summary="Most Connected Entities",
    description="Get the most connected entities (hubs) in the knowledge graph.",
)
async def get_graph_hubs(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    """
    Get the most connected entities in the knowledge graph.

    Returns entities ranked by total connections (outgoing + incoming).
    """
    from app.services.graph.analytics import GraphAnalytics

    analytics = GraphAnalytics(db)
    return await analytics.get_most_connected(current_user.id, limit=limit)


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

    Queries the links table for edges connected to this entity
    (both outgoing and incoming) and returns them as EntityRelations.
    """
    from app.services.graph.link_service import LinkService
    from app.models.link import LinkEntityType

    # Map schema EntityType → model LinkEntityType
    _type_map = {
        EntityType.DOCUMENT: LinkEntityType.DOCUMENT,
        EntityType.NOTE: LinkEntityType.NOTE,
        EntityType.FLASHCARD: LinkEntityType.FLASHCARD,
        EntityType.QUIZ: LinkEntityType.QUIZ,
    }
    link_entity_type = _type_map.get(entity_type)
    if link_entity_type is None:
        return []

    # Map model LinkEntityType → schema EntityType (reverse, partial)
    _reverse_type_map = {v: k for k, v in _type_map.items()}

    service = LinkService(db)

    # Get outgoing links (this entity is the source)
    outgoing = await service.get_links_from(
        user_id=current_user.id,
        source_type=link_entity_type,
        source_id=entity_id,
    )

    # Get incoming links (this entity is the target / backlinks)
    incoming = await service.get_links_to(
        user_id=current_user.id,
        target_type=link_entity_type,
        target_id=entity_id,
    )

    relations: list[EntityRelation] = []

    for link in outgoing:
        target_schema_type = _reverse_type_map.get(link.target_type)
        if target_schema_type is None:
            continue
        if relation_type and link.link_type.value != relation_type:
            continue
        relations.append(
            EntityRelation(
                entity=EntityIdentity(
                    id=link.target_id,
                    type=target_schema_type,
                    source_module=_get_module_for_type(target_schema_type),
                ),
                relation_type=link.link_type.value,
                weight=link.strength,
            )
        )

    for link in incoming:
        source_schema_type = _reverse_type_map.get(link.source_type)
        if source_schema_type is None:
            continue
        if relation_type and link.link_type.value != relation_type:
            continue
        relations.append(
            EntityRelation(
                entity=EntityIdentity(
                    id=link.source_id,
                    type=source_schema_type,
                    source_module=_get_module_for_type(source_schema_type),
                ),
                relation_type=link.link_type.value,
                weight=link.strength,
            )
        )

    return relations[:limit]


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


# ============================================================================
# Semantic Refresh
# ============================================================================


@router.post(
    "/refresh",
    summary="Refresh Semantic Links",
    description="Trigger an on-demand semantic link refresh for the current user. Rate-limited to 1/hr.",
)
async def refresh_semantic_links(
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Queue a semantic link refresh for the current user.

    This is rate-limited to prevent database overload.
    Returns immediately with the task ID.
    """
    from app.services.background.semantic_link_worker import semantic_refresh_user_task

    result = semantic_refresh_user_task.delay(user_id=current_user.id)
    return {"status": "queued", "task_id": str(result.id)}


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
