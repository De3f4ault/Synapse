"""
StoragePath schemas — Pydantic v2 contracts for CRUD API.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class StoragePathCreate(BaseModel):
    """Create a new storage path template."""

    name: str = Field(..., max_length=128, description="Display name")
    path_template: str = Field(
        ..., max_length=512,
        description="Path template, e.g. {correspondent}/{created_year}/{title}",
    )
    match: Optional[str] = Field(
        "", max_length=256, description="Keywords for auto-matching (comma-separated)"
    )
    matching_algorithm: int = Field(
        0, ge=0, le=6,
        description="0=none, 1=any, 2=all, 3=literal, 4=regex, 5=fuzzy, 6=auto",
    )
    is_insensitive: bool = Field(True, description="Case-insensitive matching")


class StoragePathUpdate(BaseModel):
    """Partial update for a storage path."""

    name: Optional[str] = Field(None, max_length=128)
    path_template: Optional[str] = Field(None, max_length=512)
    match: Optional[str] = Field(None, max_length=256)
    matching_algorithm: Optional[int] = Field(None, ge=0, le=6)
    is_insensitive: Optional[bool] = None


class StoragePathResponse(BaseModel):
    """StoragePath API response with document count."""

    id: int = Field(description="Storage path ID")
    name: str = Field(description="Display name")
    path_template: str = Field(description="Path template string")
    match: Optional[str] = Field("", description="Match keywords")
    matching_algorithm: int = Field(0, description="Matching algorithm (0-6)")
    is_insensitive: bool = Field(True, description="Case-insensitive")
    document_count: int = Field(0, description="Number of assigned documents")
    created_at: datetime = Field(description="Created timestamp")
    updated_at: datetime = Field(description="Last updated timestamp")

    class Config:
        from_attributes = True
