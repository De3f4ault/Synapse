"""
SavedView schemas — Pydantic v2 contracts for CRUD API.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class FilterRuleCreate(BaseModel):
    """A single filter rule within a saved view."""

    rule_type: int = Field(..., description="FilterRuleType enum value")
    value: Optional[str] = Field(None, max_length=256, description="Filter value")


class FilterRuleResponse(BaseModel):
    """Filter rule response."""

    id: int
    rule_type: int
    value: Optional[str] = None

    class Config:
        from_attributes = True


class SavedViewCreate(BaseModel):
    """Create a new saved view."""

    name: str = Field(..., max_length=128, description="View name")
    sort_field: str = Field("created_at", max_length=50, description="Sort field")
    sort_reverse: bool = Field(True, description="Sort descending")
    show_on_dashboard: bool = Field(False, description="Show on dashboard")
    show_in_sidebar: bool = Field(False, description="Show in sidebar")
    page_size: int = Field(25, ge=1, le=100, description="Results per page")
    filter_rules: List[FilterRuleCreate] = Field(
        default=[], description="Filter rules to apply"
    )


class SavedViewUpdate(BaseModel):
    """Partial update for a saved view."""

    name: Optional[str] = Field(None, max_length=128)
    sort_field: Optional[str] = Field(None, max_length=50)
    sort_reverse: Optional[bool] = None
    show_on_dashboard: Optional[bool] = None
    show_in_sidebar: Optional[bool] = None
    page_size: Optional[int] = Field(None, ge=1, le=100)
    filter_rules: Optional[List[FilterRuleCreate]] = None


class SavedViewResponse(BaseModel):
    """SavedView API response with filter rules."""

    id: int = Field(description="Saved view ID")
    name: str = Field(description="View name")
    sort_field: str = Field(description="Sort field")
    sort_reverse: bool = Field(description="Sort descending")
    show_on_dashboard: bool = Field(description="Show on dashboard")
    show_in_sidebar: bool = Field(description="Show in sidebar")
    page_size: int = Field(description="Results per page")
    filter_rules: List[FilterRuleResponse] = Field(
        default=[], description="Filter rules"
    )
    created_at: datetime = Field(description="Created timestamp")
    updated_at: datetime = Field(description="Last updated timestamp")

    class Config:
        from_attributes = True
