"""
Branch schemas.

Extracted from rest/branches.py.
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class BranchCreateRequest(BaseModel):
    """Request to create a branch from a message."""
    prompt: Optional[str] = Field(None, description="Optional rephrased prompt.")
    model_override: Optional[str] = Field(None, description="Force specific model.")


class BranchSiblingInfo(BaseModel):
    """Info about a sibling branch."""
    id: int
    is_active: bool
    version: int
    model_used: Optional[str]
    created_at: datetime
    content_preview: str = Field(description="First 100 chars of content")


class BranchSiblingsResponse(BaseModel):
    """Response with sibling branches."""
    parent_message_id: int
    total_siblings: int
    current_index: int
    siblings: List[BranchSiblingInfo]


class BranchActivateResponse(BaseModel):
    """Response after activating a branch."""
    success: bool
    activated_id: int
    deactivated_count: int
