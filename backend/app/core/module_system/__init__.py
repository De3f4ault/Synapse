"""
Learning module plugin architecture.
Provides a unified interface for all learning modules (flashcards, notes, documents, etc.)
"""
from app.core.module_system.base import LearningModule
from app.core.module_system.capabilities import ModuleCapability
from app.core.module_system.registry import ModuleRegistry
from app.core.module_system.loader import load_modules

__all__ = [
    "LearningModule",
    "ModuleCapability",
    "ModuleRegistry",
    "load_modules",
]
