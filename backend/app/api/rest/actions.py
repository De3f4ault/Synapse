"""
Platform Actions API.

Provides unified capability execution across all modules.

Endpoints:
  POST /actions/execute - Execute a capability on an entity
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.platform import (
    ActionRequest,
    PlatformActionResult,
    ActionStatus,
    ActionError,
)
from app.platform.registry import get_module_for_entity_type

router = APIRouter()


# ============================================================================
# Action Execution
# ============================================================================


@router.post(
    "/execute",
    response_model=PlatformActionResult,
    summary="Execute Capability",
    description="Execute a capability on an entity. This is the unified action endpoint.",
)
async def execute_action(
    request: ActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PlatformActionResult:
    """
    Execute a capability on an entity.

    This is the single entry point for all capability-based actions.
    It validates, routes, executes, and returns standardized results.
    """
    # Step 1: Get the module that owns this entity type
    module = get_module_for_entity_type(request.target.type)

    if not module:
        return PlatformActionResult(
            status=ActionStatus.ERROR,
            message=f"No module registered for entity type: {request.target.type}",
            error=ActionError(
                code="MODULE_NOT_FOUND",
                message=f"No module registered for entity type: {request.target.type}",
                recoverable=False,
            ),
        )

    # Step 2: Check if capability is supported
    if request.action not in module.supported_capabilities:
        return PlatformActionResult(
            status=ActionStatus.ERROR,
            message=f"Entity type {request.target.type} does not support {request.action}",
            error=ActionError(
                code="CAPABILITY_NOT_SUPPORTED",
                message=f"Entity type {request.target.type} does not support {request.action}",
                recoverable=False,
            ),
        )

    # Step 3: Check availability
    availability = await module.check_availability(
        request.target.id, request.action, db, current_user.id
    )

    if not availability.available:
        return PlatformActionResult(
            status=ActionStatus.ERROR,
            message=availability.reason or f"Capability {request.action} is not available",
            error=ActionError(
                code="CAPABILITY_UNAVAILABLE",
                message=availability.reason or f"Capability {request.action} is not available",
                recoverable=True,
            ),
        )

    # Step 4: Resolve entity
    entity = await module.resolve_entity(request.target.id, db, current_user.id)

    if not entity:
        return PlatformActionResult(
            status=ActionStatus.ERROR,
            message=f"Entity not found: {request.target.type}:{request.target.id}",
            error=ActionError(
                code="ENTITY_NOT_FOUND",
                message=f"Entity not found: {request.target.type}:{request.target.id}",
                recoverable=False,
            ),
        )

    # Step 5: Execute capability
    try:
        result = await module.execute_capability(
            request.action, entity, db, current_user.id, request.options
        )
        return result
    except Exception as e:
        return PlatformActionResult(
            status=ActionStatus.ERROR,
            message=str(e),
            error=ActionError(
                code="EXECUTION_FAILED",
                message=str(e),
                recoverable=True,
            ),
        )
