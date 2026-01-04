"""
Platform Module Registry.

INVARIANT: Modules register themselves here at startup.
INVARIANT: Platform queries registry, never imports modules directly.

This is the backend equivalent of frontend's shared/platform/registry.ts.
"""

from typing import Any, Protocol
from dataclasses import dataclass, field

from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.platform import (
    EntityType,
    EntityCapability,
    ModuleId,
    LearningEntity,
    ResolvedCapability,
    PlatformActionResult,
)


# ============================================================================
# Protocol Definitions (Type Contracts)
# ============================================================================


class EntityResolver(Protocol):
    """
    Protocol for entity resolution functions.
    Each module provides its own implementation.
    """

    async def __call__(
        self, entity_id: int | str, db: AsyncSession, user_id: int
    ) -> LearningEntity | None:
        """Resolve an entity by ID."""
        ...


class CapabilityExecutor(Protocol):
    """
    Protocol for capability execution functions.
    """

    async def __call__(
        self,
        capability: EntityCapability,
        entity: LearningEntity,
        db: AsyncSession,
        user_id: int,
        options: dict[str, Any] | None = None,
    ) -> PlatformActionResult:
        """Execute a capability on an entity."""
        ...


class AvailabilityChecker(Protocol):
    """
    Protocol for capability availability checking.
    """

    async def __call__(
        self,
        entity_id: int | str,
        capability: EntityCapability,
        db: AsyncSession,
        user_id: int,
    ) -> ResolvedCapability:
        """Check if a capability is available for an entity."""
        ...


# ============================================================================
# Module Contract
# ============================================================================


@dataclass
class ModuleContract:
    """
    Contract that each module must fulfill to register with the platform.
    """

    id: ModuleId
    name: str
    entity_types: list[EntityType]
    resolve_entity: EntityResolver
    execute_capability: CapabilityExecutor
    check_availability: AvailabilityChecker
    supported_capabilities: list[EntityCapability] = field(default_factory=list)


# ============================================================================
# Registry State
# ============================================================================

# Map of registered modules by their ID
_modules: dict[ModuleId, ModuleContract] = {}

# Map of entity types to their owning modules
_entity_type_owners: dict[EntityType, ModuleId] = {}


# ============================================================================
# Registration API
# ============================================================================


def register_module(contract: ModuleContract) -> None:
    """
    Register a module with the platform.
    Should be called during app initialization.
    """
    if contract.id in _modules:
        # Update existing registration (useful for hot reload)
        pass

    _modules[contract.id] = contract

    # Register entity type ownership
    for entity_type in contract.entity_types:
        _entity_type_owners[entity_type] = contract.id


def unregister_module(module_id: ModuleId) -> None:
    """
    Unregister a module (primarily for testing).
    """
    if module_id in _modules:
        contract = _modules[module_id]
        for entity_type in contract.entity_types:
            if _entity_type_owners.get(entity_type) == module_id:
                del _entity_type_owners[entity_type]
        del _modules[module_id]


# ============================================================================
# Query API
# ============================================================================


def get_module(module_id: ModuleId) -> ModuleContract | None:
    """Get a registered module by ID."""
    return _modules.get(module_id)


def get_module_for_entity_type(entity_type: EntityType) -> ModuleContract | None:
    """Get the module that owns a specific entity type."""
    module_id = _entity_type_owners.get(entity_type)
    return _modules.get(module_id) if module_id else None


def get_all_modules() -> list[ModuleContract]:
    """Get all registered modules."""
    return list(_modules.values())


def is_module_registered(module_id: ModuleId) -> bool:
    """Check if a module is registered."""
    return module_id in _modules


def get_registered_module_ids() -> list[ModuleId]:
    """Get a list of all registered module IDs."""
    return list(_modules.keys())


# ============================================================================
# Utilities
# ============================================================================


def clear_registry() -> None:
    """Clear all registrations (for testing)."""
    _modules.clear()
    _entity_type_owners.clear()


def get_registry_stats() -> dict[str, int]:
    """Get registry stats (for debugging)."""
    return {
        "module_count": len(_modules),
        "entity_types_owned": len(_entity_type_owners),
    }
