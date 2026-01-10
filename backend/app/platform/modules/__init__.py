"""
Platform modules package.

Individual module registrations with the platform.
"""

from .notes import init_notes_module
from .documents import init_documents_module
from .flashcards import init_flashcards_module
from .quizzes import init_quizzes_module

__all__ = [
    "init_notes_module",
    "init_documents_module",
    "init_flashcards_module",
    "init_quizzes_module",
]
