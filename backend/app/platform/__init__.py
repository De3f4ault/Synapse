"""
Platform package.

Provides the platform kernel for cross-module operations.
"""

from .registry import (
    ModuleContract,
    register_module,
    unregister_module,
    get_module,
    get_module_for_entity_type,
    get_all_modules,
    is_module_registered,
    get_registered_module_ids,
    clear_registry,
    get_registry_stats,
)

from .init import init_platform, is_platform_initialized

__all__ = [
    # Registry
    "ModuleContract",
    "register_module",
    "unregister_module",
    "get_module",
    "get_module_for_entity_type",
    "get_all_modules",
    "is_module_registered",
    "get_registered_module_ids",
    "clear_registry",
    "get_registry_stats",
    # Init
    "init_platform",
    "is_platform_initialized",
]
