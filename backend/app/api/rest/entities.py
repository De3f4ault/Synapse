"""
Platform Entities API.

Provides unified entity resolution across all modules.

Endpoints:
  GET /entities/search - Search entities across all modules
  GET /entities/{type}/{id} - Resolve entity to full LearningEntity
  GET /entities/{type}/{id}/capabilities - Get capability availability
"""

import logging
import asyncio
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db, AsyncSessionLocal
from app.api.deps import get_current_user
from app.models.user import User

_log = logging.getLogger(__name__)
from app.schemas.platform import (
    EntityType,
    LearningEntity,
    ResolvedCapability,
    EntityCapability,
    EntitySearchResult,
)
from app.platform.registry import get_module_for_entity_type, get_all_modules

router = APIRouter()


# ============================================================================
# Entity Resolution
# ============================================================================


@router.get(
    "/search",
    response_model=dict[str, list[EntitySearchResult]],
    summary="Search Entities",
    description="Search for entities across all registered modules.",
)
async def search_entities(
    q: str = Query(..., min_length=1, description="Search query"),
    types: Optional[list[EntityType]] = Query(
        None, description="Filter by entity types (default: all)"
    ),
    limit: int = Query(20, ge=1, le=50, description="Max results per module"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Search for entities across the platform.

    Aggregates results from all modules that support search.
    Respects user permissions (enforced by modules).
    """
    results: list[EntitySearchResult] = []

    # 1. Determine which modules to query
    modules_to_query = []
    if types:
        seen_modules = set()
        for et in types:
            module = get_module_for_entity_type(et)
            if module and module.search_entities and module.id not in seen_modules:
                modules_to_query.append(module)
                seen_modules.add(module.id)
    else:
        for module in get_all_modules():
            if module.search_entities:
                modules_to_query.append(module)

    if not modules_to_query:
        return {"results": []}

    # 2. Execute searches in parallel, each with its OWN session.
    #
    # INVARIANT: AsyncSession is NOT concurrent-safe. Sharing a single session
    # across asyncio.gather tasks causes
    #   "InvalidRequestError: This session is provisioning a new connection;
    #    concurrent operations are not permitted".
    # Fix: each module coroutine opens and closes its own AsyncSessionLocal.
    async def _search_one(module) -> list[EntitySearchResult]:
        async with AsyncSessionLocal() as session:
            return await module.search_entities(
                query=q, db=session, user_id=current_user.id, limit=limit
            )

    search_tasks = [_search_one(module) for module in modules_to_query]

    # 3. Aggregate results
    module_results = await asyncio.gather(*search_tasks, return_exceptions=True)

    for i, res in enumerate(module_results):
        if isinstance(res, Exception):
            _log.error(
                "Entity search error in module %s: %s: %s",
                modules_to_query[i].id,
                type(res).__name__,
                res,
                exc_info=res,
            )
            continue
        if res:
            results.extend(res)

    # 4. Filter by requested types and sort by freshness
    if types:
        results = [r for r in results if r.type in types]

    results.sort(key=lambda x: x.created_at or datetime.min, reverse=True)

    return {"results": results}


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
