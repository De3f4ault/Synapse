"""
Shared platform-level enums used across schemas and modules.

These are the canonical enum definitions — must match frontend types exactly.
All modules import from here, not from individual domain files.
"""

from enum import Enum


class EntityType(str, Enum):
    """
    Canonical entity types across the platform.
    Must match frontend EntityType exactly.
    """

    DOCUMENT = "document"
    NOTE = "note"
    FLASHCARD = "flashcard"
    QUIZ = "quiz"
    CONCEPT = "concept"


class EntityCapability(str, Enum):
    """
    Actions that can be performed on entities.
    Must match frontend EntityCapability exactly.
    """

    REFERENCE_IN_CHAT = "REFERENCE_IN_CHAT"
    GENERATE_FLASHCARDS = "GENERATE_FLASHCARDS"
    GENERATE_QUIZ = "GENERATE_QUIZ"
    REINFORCE_GRAPH = "REINFORCE_GRAPH"
    EXPORT = "EXPORT"
    SUMMARIZE = "SUMMARIZE"


class ModuleId(str, Enum):
    """
    Registered module identifiers.
    Must match frontend ModuleId exactly.
    """

    NOTES = "notes"
    DOCUMENTS = "documents"
    FLASHCARDS = "flashcards"
    QUIZZES = "quizzes"
    CHAT = "chat"
    GRAPH = "graph"


class EntityVisibility(str, Enum):
    """Entity visibility levels."""

    PRIVATE = "private"
    WORKSPACE = "workspace"
    GLOBAL = "global"


class ActionStatus(str, Enum):
    """Status of a platform action."""

    SUCCESS = "success"
    ERROR = "error"
    CANCELLED = "cancelled"
    PENDING = "pending"
