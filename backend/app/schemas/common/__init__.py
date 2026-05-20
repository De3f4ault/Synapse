"""
common/ — Shared base types, pagination, and platform enums.

Import from here for generic response wrappers and pagination:
    from app.schemas.common import MessageResponse, PaginationParams, PaginatedResponse

Import from here for platform-level enums:
    from app.schemas.common import EntityType, ModuleId, ActionStatus
"""

from app.schemas.common.base import APIResponse, MessageResponse
from app.schemas.common.pagination import PaginationParams, PaginatedResponse
from app.schemas.common.enums import (
    EntityType,
    EntityCapability,
    ModuleId,
    EntityVisibility,
    ActionStatus,
)

__all__ = [
    # Base
    "APIResponse",
    "MessageResponse",
    # Pagination
    "PaginationParams",
    "PaginatedResponse",
    # Enums
    "EntityType",
    "EntityCapability",
    "ModuleId",
    "EntityVisibility",
    "ActionStatus",
]
