"""
platform/ — Platform-level entity contracts, belief model, and action schemas.

NOTE: Enums live in app.schemas.common.enums but are re-exported here for
backward compatibility — all existing `from app.schemas.platform import EntityType`
imports continue to work.
"""

# Re-export enums so consumers don't need to change their imports
from app.schemas.common.enums import (
    EntityType,
    EntityCapability,
    ModuleId,
    EntityVisibility,
    ActionStatus,
)

from app.schemas.platform.platform import (
    EntityIdentity,
    EntitySearchResult,
    ResolvedCapability,
    LearningEntity,
    PlatformAction,
    GraphContext,
    WeaknessEvidence,
    ConceptState,
    AssistantContext,
    EntityRelation,
    GraphEffect,
    ActionError,
    PlatformActionResult,
    ActionRequest,
)

__all__ = [
    "EntityIdentity",
    "EntitySearchResult",
    "ResolvedCapability",
    "LearningEntity",
    "PlatformAction",
    "GraphContext",
    "WeaknessEvidence",
    "ConceptState",
    "AssistantContext",
    "EntityRelation",
    "GraphEffect",
    "ActionError",
    "PlatformActionResult",
    "ActionRequest",
]
