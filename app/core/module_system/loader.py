"""
Automatic module discovery and loading.
Scans the modules directory and registers all learning modules.
"""
import importlib
import inspect
import pkgutil
from pathlib import Path
from typing import List, Type

from app.core.module_system.base import LearningModule
from app.core.module_system.registry import ModuleRegistry
from app.utils.logging import get_logger

logger = get_logger(__name__)


async def load_modules() -> None:
    """
    Discover and load all learning modules from the modules directory.

    Scans app/modules/ for subdirectories containing module.py files,
    finds LearningModule subclasses, instantiates them, and registers
    them with the ModuleRegistry.
    """
    registry = ModuleRegistry()
    modules_dir = Path(__file__).parent.parent.parent / "modules"

    if not modules_dir.exists():
        logger.warning(
            "modules_directory_not_found",
            path=str(modules_dir),
        )
        return

    logger.info(
        "loading_modules",
        modules_dir=str(modules_dir),
    )

    loaded_count = 0
    failed_count = 0

    # Scan for module directories
    for item in modules_dir.iterdir():
        if not item.is_dir() or item.name.startswith("_"):
            continue

        module_file = item / "module.py"

        if not module_file.exists():
            logger.debug(
                "module_file_not_found",
                directory=item.name,
            )
            continue

        try:
            # Import the module
            module_path = f"app.modules.{item.name}.module"
            module = importlib.import_module(module_path)

            # Find LearningModule subclasses
            module_classes = _find_module_classes(module)

            if not module_classes:
                logger.warning(
                    "no_module_class_found",
                    directory=item.name,
                    path=module_path,
                )
                continue

            # Instantiate and register each module class
            for module_class in module_classes:
                try:
                    # Create instance
                    module_instance = module_class()

                    # Register with registry
                    registry.register(module_instance)

                    loaded_count += 1

                    logger.info(
                        "module_loaded",
                        module_name=module_instance.get_name(),
                        class_name=module_class.__name__,
                    )

                except Exception as e:
                    failed_count += 1
                    logger.error(
                        "module_registration_failed",
                        class_name=module_class.__name__,
                        error=str(e),
                    )

        except Exception as e:
            failed_count += 1
            logger.error(
                "module_import_failed",
                directory=item.name,
                error=str(e),
            )

    # Log summary
    logger.info(
        "module_loading_complete",
        loaded=loaded_count,
        failed=failed_count,
        total=loaded_count + failed_count,
    )


def _find_module_classes(module) -> List[Type[LearningModule]]:
    """
    Find all LearningModule subclasses in a module.

    Args:
        module: Python module to search

    Returns:
        List of LearningModule subclass types
    """
    module_classes = []

    for name, obj in inspect.getmembers(module, inspect.isclass):
        # Check if it's a LearningModule subclass (but not LearningModule itself)
        if (issubclass(obj, LearningModule) and
            obj is not LearningModule and
            obj.__module__ == module.__name__):
            module_classes.append(obj)

    return module_classes


def reload_modules() -> None:
    """
    Reload all modules.
    Useful for development/testing.
    """
    registry = ModuleRegistry()
    registry.clear()
    load_modules()
