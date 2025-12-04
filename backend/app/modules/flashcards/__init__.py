"""
Flashcards Module Package

Spaced repetition flashcard system using SM-2 algorithm.

Components:
- module.py: LearningModule implementation
- service.py: Business logic layer
- repository.py: SQL query layer
- constants.py: Module constants
"""

from .module import FlashcardModule
from .service import FlashcardService
from .repository import FlashcardRepository
from .constants import (
    LearningState,
    QUALITY_RATINGS,
    DEFAULT_EASE_FACTOR,
    MODULE_NAME
)

__all__ = [
    "FlashcardModule",
    "FlashcardService",
    "FlashcardRepository",
    "LearningState",
    "QUALITY_RATINGS",
    "DEFAULT_EASE_FACTOR",
    "MODULE_NAME"
]
