"""
Module registry for managing learning modules.
Singleton pattern to maintain global registry of all modules.
"""
from typing import Dict, List, Optional

from app.core.module_system.base import LearningModule
from app.core.module_system.capabilities import ModuleCapability
from app.core.exceptions import ResourceNotFoundError
from app.utils.logging import get_logger

logger = get_logger(__name__)


class ModuleRegistry:
    """
    Singleton registry for learning modules.
    Manages registration and retrieval of all learning modules.
    """

    _instance: Optional['ModuleRegistry'] = None
    _modules: Dict[str, LearningModule] = {}

    def __new__(cls):
        """Implement singleton pattern."""
        if cls._instance is None:
            cls._instance = super(ModuleRegistry, cls).__new__(cls)
            cls._instance._modules = {}
        return cls._instance

    def register(self, module: LearningModule) -> None:
        """
        Register a learning module.

        Args:
            module: Module instance to register

        Raises:
            ValueError: If module name is already registered
        """
        module_name = module.get_name()

        # Check if module already registered
        if module_name in self._modules:
            logger.warning(
                "module_already_registered",
                module_name=module_name,
            )
            raise ValueError(f"Module '{module_name}' is already registered")

        # Validate module name
        if not module_name or not module_name.isidentifier():
            raise ValueError(
                f"Invalid module name '{module_name}'. Must be a valid Python identifier."
            )

        # Register module
        self._modules[module_name] = module

        logger.info(
            "module_registered",
            module_name=module_name,
            display_name=module.get_display_name(),
            capabilities=[cap.value for cap in module.get_capabilities()],
        )

    def unregister(self, name: str) -> None:
        """
        Unregister a learning module.

        Args:
            name: Name of module to unregister

        Raises:
            ResourceNotFoundError: If module not found
        """
        if name not in self._modules:
            raise ResourceNotFoundError(
                resource_type="Module",
                resource_id=name
            )

        del self._modules[name]

        logger.info(
            "module_unregistered",
            module_name=name,
        )

    def get_module(self, name: str) -> LearningModule:
        """
        Get a module by name.

        Args:
            name: Module name

        Returns:
            LearningModule: The requested module

        Raises:
            ResourceNotFoundError: If module not found
        """
        if name not in self._modules:
            raise ResourceNotFoundError(
                resource_type="Module",
                resource_id=name
            )

        return self._modules[name]

    def get_all_modules(self) -> List[LearningModule]:
        """
        Get all registered modules.

        Returns:
            List[LearningModule]: List of all modules
        """
        return list(self._modules.values())

    def list_module_names(self) -> List[str]:
        """
        Get names of all registered modules.

        Returns:
            List[str]: List of module names
        """
        return list(self._modules.keys())

    def get_modules_by_capability(
        self,
        capability: ModuleCapability
    ) -> List[LearningModule]:
        """
        Get all modules that support a specific capability.

        Args:
            capability: Capability to filter by

        Returns:
            List[LearningModule]: Modules with the capability
        """
        return [
            module for module in self._modules.values()
            if module.has_capability(capability)
        ]

    def module_exists(self, name: str) -> bool:
        """
        Check if a module is registered.

        Args:
            name: Module name to check

        Returns:
            bool: True if module exists
        """
        return name in self._modules

    def get_module_info(self, name: str) -> Dict[str, any]:
        """
        Get information about a module.

        Args:
            name: Module name

        Returns:
            Dict with module information

        Raises:
            ResourceNotFoundError: If module not found
        """
        module = self.get_module(name)

        return {
            "name": module.get_name(),
            "display_name": module.get_display_name(),
            "description": module.get_description(),
            "capabilities": [cap.value for cap in module.get_capabilities()],
        }

    def get_all_modules_info(self) -> List[Dict[str, any]]:
        """
        Get information about all registered modules.

        Returns:
            List of module information dictionaries
        """
        return [
            self.get_module_info(name)
            for name in self._modules.keys()
        ]

    def clear(self) -> None:
        """
        Clear all registered modules.
        Useful for testing.
        """
        self._modules.clear()
        logger.info("module_registry_cleared")


# Convenience function to get the singleton instance
def get_registry() -> ModuleRegistry:
    """
    Get the module registry singleton instance.

    Returns:
        ModuleRegistry: The global module registry
    """
    return ModuleRegistry()
