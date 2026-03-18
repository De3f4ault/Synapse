"""
Tag schemas — Pydantic v2 contracts for evolved Tag CRUD API.

Includes matching fields, hierarchy, inbox flag, and color.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class TagCreate(BaseModel):
    """Create a new tag with optional matching rules."""

    name: str = Field(..., max_length=128, description="Tag name")
    color: str = Field("#a6cee3", max_length=7, description="Hex color code")
    is_inbox_tag: bool = Field(False, description="Auto-apply to new documents")
    parent_id: Optional[int] = Field(None, description="Parent tag ID for hierarchy")
    match: Optional[str] = Field(
        "", max_length=256, description="Keywords for auto-matching (comma-separated)"
    )
    matching_algorithm: int = Field(
        0, ge=0, le=6,
        description="0=none, 1=any, 2=all, 3=literal, 4=regex, 5=fuzzy, 6=auto",
    )
    is_insensitive: bool = Field(True, description="Case-insensitive matching")


class TagUpdate(BaseModel):
    """Partial update for a tag."""

    name: Optional[str] = Field(None, max_length=128)
    color: Optional[str] = Field(None, max_length=7)
    is_inbox_tag: Optional[bool] = None
    parent_id: Optional[int] = None
    match: Optional[str] = Field(None, max_length=256)
    matching_algorithm: Optional[int] = Field(None, ge=0, le=6)
    is_insensitive: Optional[bool] = None


class TagResponse(BaseModel):
    """Tag API response with document count and hierarchy info."""

    id: int = Field(description="Tag ID")
    name: str = Field(description="Tag name")
    color: str = Field("#a6cee3", description="Hex color code")
    is_inbox_tag: bool = Field(False, description="Auto-apply to new docs")
    parent_id: Optional[int] = Field(None, description="Parent tag ID")
    match: Optional[str] = Field("", description="Match keywords")
    matching_algorithm: int = Field(0, description="Matching algorithm (0-6)")
    is_insensitive: bool = Field(True, description="Case-insensitive")
    document_count: int = Field(0, description="Number of tagged documents")
    created_at: datetime = Field(description="Created timestamp")
    updated_at: datetime = Field(description="Last updated timestamp")

    class Config:
        from_attributes = True
