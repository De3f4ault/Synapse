"""
Notes Module Package

Hierarchical note-taking system with version control and full-text search.

Components:
- module.py: LearningModule implementation
- service.py: Business logic layer
- repository.py: SQL query layer
- constants.py: Module constants
"""

from .module import NoteModule
from .service import NoteService
from .repository import NoteRepository
from .constants import NoteFormat, MODULE_NAME

__all__ = [
    "NoteModule",
    "NoteService",
    "NoteRepository",
    "NoteFormat",
    "MODULE_NAME"
]
