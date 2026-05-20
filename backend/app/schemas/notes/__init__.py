"""
notes/ — Note schemas.

    from app.schemas.notes import NoteCreate, NoteResponse
"""

from app.schemas.notes.note import (
    NoteBase,
    NoteCreate,
    NoteUpdate,
    NoteResponse,
    NoteTreeResponse,
    NoteVersionResponse,
    NoteSearchResult,
    JournalDateResponse,
    TagBase,
    TagCreate,
    TagResponse,
)

__all__ = [
    "NoteBase",
    "NoteCreate",
    "NoteUpdate",
    "NoteResponse",
    "NoteTreeResponse",
    "NoteVersionResponse",
    "NoteSearchResult",
    "JournalDateResponse",
    # Note-level tags (distinct from document tags in documents/tags.py)
    "TagBase",
    "TagCreate",
    "TagResponse",
]
