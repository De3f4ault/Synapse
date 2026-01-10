"""
Platform Initialization.

INVARIANT: All modules register here during app startup.
INVARIANT: This runs BEFORE any request is served.

Call init_platform() in main.py during app startup.
"""

from .modules import (
    init_notes_module,
    init_documents_module,
    init_flashcards_module,
    init_quizzes_module,
)

_initialized = False


def init_platform() -> None:
    """
    Initialize the platform with all modules.
    Safe to call multiple times (idempotent).
    """
    global _initialized

    if _initialized:
        return

    # Register all modules
    init_notes_module()
    init_documents_module()
    init_flashcards_module()
    init_quizzes_module()

    _initialized = True


def is_platform_initialized() -> bool:
    """Check if platform is initialized."""
    return _initialized
