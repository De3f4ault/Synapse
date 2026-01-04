"""
Platform Entities API.

Provides unified entity resolution across all modules.

Endpoints:
  GET /entities/{type}/{id} - Resolve entity to full LearningEntity
  GET /entities/{type}/{id}/capabilities - Get capability availability
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.platform import (
    EntityType,
    LearningEntity,
    ResolvedCapability,
    EntityCapability,
)
from app.platform.registry import get_module_for_entity_type

router = APIRouter()


# ============================================================================
# Entity Resolution
# ============================================================================


@router.get(
    "/{entity_type}/{entity_id}",
    response_model=LearningEntity,
    summary="Resolve Entity",
    description="Resolve an entity identity to a full LearningEntity with capabilities.",
)
async def resolve_entity(
    entity_type: EntityType,
    entity_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LearningEntity:
    """
    Resolve an entity to its full representation.

    This is the canonical way to get entity details across all modules.
    """
    module = get_module_for_entity_type(entity_type)

    if not module:
        raise HTTPException(
            status_code=501,
            detail=f"No module registered for entity type: {entity_type}",
        )

    entity = await module.resolve_entity(entity_id, db, current_user.id)

    if not entity:
        raise HTTPException(
            status_code=404,
            detail=f"Entity not found: {entity_type}:{entity_id}",
        )

    return entity


# ============================================================================
# Capability Availability
# ============================================================================


@router.get(
    "/{entity_type}/{entity_id}/capabilities",
    response_model=list[ResolvedCapability],
    summary="Get Capabilities",
    description="Get all capabilities and their availability for an entity.",
)
async def get_entity_capabilities(
    entity_type: EntityType,
    entity_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ResolvedCapability]:
    """
    Get all capabilities and their runtime availability for an entity.

    This allows the frontend to know exactly what actions are possible
    without guessing based on heuristics.
    """
    module = get_module_for_entity_type(entity_type)

    if not module:
        raise HTTPException(
            status_code=501,
            detail=f"No module registered for entity type: {entity_type}",
        )

    # Get all supported capabilities for this entity type
    capabilities: list[ResolvedCapability] = []

    for capability in module.supported_capabilities:
        resolved = await module.check_availability(entity_id, capability, db, current_user.id)
        capabilities.append(resolved)

    return capabilities


@router.get(
    "/{entity_type}/{entity_id}/capabilities/{capability}",
    response_model=ResolvedCapability,
    summary="Check Capability",
    description="Check if a specific capability is available for an entity.",
)
async def check_entity_capability(
    entity_type: EntityType,
    entity_id: int,
    capability: EntityCapability,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ResolvedCapability:
    """
    Check if a specific capability is available for an entity.
    """
    module = get_module_for_entity_type(entity_type)

    if not module:
        raise HTTPException(
            status_code=501,
            detail=f"No module registered for entity type: {entity_type}",
        )

    if capability not in module.supported_capabilities:
        return ResolvedCapability(
            capability=capability,
            available=False,
            reason=f"Entity type {entity_type} does not support {capability}",
        )

    return await module.check_availability(entity_id, capability, db, current_user.id)
