"""
Note schemas — single source of truth for all note-related API contracts.
"""

from datetime import datetime
from typing import List, Optional, Union, Any
from pydantic import BaseModel, Field
from app.models.note import NoteFormat


# Tag Schemas


class TagBase(BaseModel):
    """Base tag schema."""

    name: str = Field(min_length=1, max_length=100, description="Tag name")
    color: Optional[str] = Field(
        default=None, pattern="^#[0-9A-Fa-f]{6}$", description="Tag color (hex)"
    )


class TagCreate(TagBase):
    """Tag creation schema."""

    class Config:
        json_schema_extra = {"example": {"name": "biology", "color": "#4CAF50"}}


class TagResponse(TagBase):
    """Tag response schema."""

    id: int = Field(description="Tag ID")
    user_id: int = Field(description="Owner user ID")
    created_at: datetime = Field(description="Creation time")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "user_id": 1,
                "name": "biology",
                "color": "#4CAF50",
                "created_at": "2025-11-01T10:00:00Z",
            }
        }


# Note Schemas


class NoteBase(BaseModel):
    """Base note schema."""

    title: str = Field(min_length=1, max_length=500, description="Note title")
    content: Union[str, dict, Any] = Field(description="Note content (string or BlockSuite JSONB)")
    format: str = Field(
        default="markdown", pattern="^(markdown|html|plain)$", description="Content format"
    )


class NoteCreate(NoteBase):
    """Note creation schema."""

    parent_id: Optional[int] = Field(default=None, description="Parent note ID for hierarchy")
    tags: List[str] = Field(default_factory=list, description="Tag names")

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Cell Structure",
                "content": "# Cell Structure\n\n## Nucleus\nThe nucleus is the control center...",
                "format": "markdown",
                "parent_id": None,
                "tags": ["biology", "cells"],
            }
        }


class NoteUpdate(BaseModel):
    """Note update schema."""

    title: Optional[str] = Field(
        default=None, min_length=1, max_length=500, description="Note title"
    )
    content: Optional[Union[str, dict, Any]] = Field(
        default=None, description="Note content (string or BlockSuite JSONB)"
    )
    format: Optional[NoteFormat] = Field(default=None, description="Content format")
    parent_id: Optional[int] = Field(default=None, description="Parent note ID")
    tags: Optional[List[str]] = Field(default=None, description="Tag names")
    is_favorite: Optional[bool] = Field(default=None, description="Favorite flag")
    is_archived: Optional[bool] = Field(default=None, description="Archive flag")
    journal_date: Optional[str] = Field(
        default=None, pattern="^\\d{4}-\\d{2}-\\d{2}$", description="Journal date YYYY-MM-DD"
    )


class NoteResponse(NoteBase):
    """Note response schema."""

    id: int = Field(description="Note ID")
    user_id: int = Field(description="Owner user ID")
    parent_id: Optional[int] = Field(default=None, description="Parent note ID")
    embedding_id: Optional[str] = Field(default=None, description="Embedding vector ID")
    journal_date: Optional[str] = Field(default=None, description="YYYY-MM-DD if journal entry")
    is_favorite: bool = Field(default=False, description="Favorite flag")
    is_archived: bool = Field(default=False, description="Archive flag")
    children_count: int = Field(default=0, description="Number of child notes")
    created_at: datetime = Field(description="Creation time")
    updated_at: datetime = Field(description="Last update time")

    class Config:
        from_attributes = True


class NoteTreeResponse(BaseModel):
    """Hierarchical note tree response."""

    id: int = Field(description="Note ID")
    title: str = Field(description="Note title")
    parent_id: Optional[int] = Field(default=None, description="Parent note ID")
    children: List["NoteTreeResponse"] = Field(default_factory=list, description="Child notes")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "title": "Biology",
                "parent_id": None,
                "children": [
                    {
                        "id": 2,
                        "title": "Cell Biology",
                        "parent_id": 1,
                        "children": [
                            {"id": 3, "title": "Cell Structure", "parent_id": 2, "children": []}
                        ],
                    }
                ],
            }
        }


# Allow recursive model
NoteTreeResponse.model_rebuild()


class NoteVersionResponse(BaseModel):
    """Note version response schema."""

    id: int = Field(description="Version ID")
    note_id: int = Field(description="Parent note ID")
    version_number: int = Field(description="Version number")
    title: str = Field(description="Note title at this version")
    created_at: datetime = Field(description="Version creation time")
    created_by: int = Field(description="User who created this version")

    class Config:
        from_attributes = True


class NoteSearchResult(BaseModel):
    """Note search result — flat format for endpoint consumption."""

    id: int
    title: str
    content: Union[str, dict, Any]
    format: NoteFormat
    score: float = Field(description="Search relevance score")
    match_type: str = Field(description="Match type: title, content, or semantic")


class JournalDateResponse(BaseModel):
    """Journal date with note info."""

    date: str = Field(description="Journal date YYYY-MM-DD")
    note_id: int = Field(description="Associated note ID")
    title: str = Field(description="Note title")
