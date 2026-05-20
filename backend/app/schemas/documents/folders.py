"""
Folder schemas.

Extracted from rest/folders.py.
"""

from typing import Any, List, Optional
from pydantic import BaseModel, Field


class FolderSettingsSchema(BaseModel):
    """Folder customization settings."""
    icon: Optional[str] = "folder"
    color: Optional[str] = None


class FolderResponse(BaseModel):
    """Folder response schema."""
    id: int
    name: str
    parent_id: Optional[int]
    rank: str
    is_system: bool
    is_pinned: bool
    settings: Optional[FolderSettingsSchema] = None

    model_config = {"from_attributes": True}


class FolderTreeNode(FolderResponse):
    """Folder with children for tree view."""
    children: List[Any] = []
    document_count: int = 0

    model_config = {"from_attributes": True}


class CreateFolderRequest(BaseModel):
    """Create folder request."""
    name: str = Field(..., min_length=1, max_length=255)
    parent_id: Optional[int] = None
    settings: Optional[FolderSettingsSchema] = None


class UpdateFolderRequest(BaseModel):
    """Update folder metadata."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    settings: Optional[FolderSettingsSchema] = None
    is_pinned: Optional[bool] = None


class MoveFolderRequest(BaseModel):
    """Move folder to new location."""
    new_parent_id: Optional[int] = None
    position: str = Field(..., pattern="^(before|after|first|last)$")
    sibling_id: Optional[int] = None


class DeleteStrategy(str):
    PROMOTE = "promote"
    INBOX = "inbox"
