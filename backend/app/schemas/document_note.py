"""
Document Note schemas — request/response contracts.

Matches Paperless-ngx NotesSerializer (serialisers.py L960-975).
"""

from datetime import datetime
from pydantic import BaseModel, Field


class DocumentNoteCreate(BaseModel):
    """Request body for creating a document note."""

    note: str = Field(..., min_length=1, max_length=5000, description="Note content")


class DocumentNoteResponse(BaseModel):
    """Response for a single document note."""

    id: int = Field(description="Note ID")
    document_id: int = Field(description="Document this note belongs to")
    user_id: int = Field(description="Author user ID")
    note: str = Field(description="Note content")
    created_at: datetime = Field(description="When the note was created")

    # Populated from joined User
    username: str | None = Field(default=None, description="Author username")

    class Config:
        from_attributes = True
