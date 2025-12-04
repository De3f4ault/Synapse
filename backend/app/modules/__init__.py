"""
SYNAPSE Learning Modules Package

This package contains all learning modules (flashcards, notes, documents, quizzes, chat).
Each module implements the LearningModule interface and registers itself with the module system.
"""

# Import order matters - base module system must be available first
# Actual module imports will be done by the module loader at startup

__all__ = [
    "flashcards",
    "notes",
    "documents",
    "quizzes",
    "chat"
]
