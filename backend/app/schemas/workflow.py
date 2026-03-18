"""
Pydantic schemas for Workflow, WorkflowTrigger, WorkflowAction, WorkflowRun.

Create/Update schemas for API input, Response schemas for API output.
"""

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# WorkflowTrigger schemas
# ---------------------------------------------------------------------------

class WorkflowTriggerCreate(BaseModel):
    """Create a workflow trigger."""

    type: int = Field(..., ge=1, le=4, description="1=CONSUMPTION, 2=ADDED, 3=UPDATED, 4=SCHEDULED")

    # Source filters
    filter_sources: Optional[List[str]] = None
    filter_filename: Optional[str] = None
    filter_path: Optional[str] = None

    # Content matching
    match: str = ""
    matching_algorithm: int = 0
    is_insensitive: bool = True

    # Tag filters
    filter_has_tag_ids: Optional[List[int]] = None
    filter_has_all_tag_ids: Optional[List[int]] = None
    filter_has_not_tag_ids: Optional[List[int]] = None

    # Document type filter
    filter_has_document_type_id: Optional[int] = None
    filter_has_not_document_type_ids: Optional[List[int]] = None

    # Correspondent filter
    filter_has_correspondent_id: Optional[int] = None
    filter_has_not_correspondent_ids: Optional[List[int]] = None

    # Storage path filter
    filter_has_storage_path_id: Optional[int] = None
    filter_has_not_storage_path_ids: Optional[List[int]] = None

    # Schedule config
    schedule_date_field: str = "added"
    schedule_offset_days: int = 0
    schedule_is_recurring: bool = False
    schedule_recurring_interval_days: int = Field(1, ge=1)

    @field_validator("schedule_date_field")
    @classmethod
    def validate_date_field(cls, v):
        allowed = {"added", "created", "modified"}
        if v not in allowed:
            raise ValueError(f"schedule_date_field must be one of {allowed}")
        return v


class WorkflowTriggerUpdate(BaseModel):
    """Update a workflow trigger — all fields optional."""

    type: Optional[int] = None
    filter_sources: Optional[List[str]] = None
    filter_filename: Optional[str] = None
    filter_path: Optional[str] = None
    match: Optional[str] = None
    matching_algorithm: Optional[int] = None
    is_insensitive: Optional[bool] = None
    filter_has_tag_ids: Optional[List[int]] = None
    filter_has_all_tag_ids: Optional[List[int]] = None
    filter_has_not_tag_ids: Optional[List[int]] = None
    filter_has_document_type_id: Optional[int] = None
    filter_has_not_document_type_ids: Optional[List[int]] = None
    filter_has_correspondent_id: Optional[int] = None
    filter_has_not_correspondent_ids: Optional[List[int]] = None
    filter_has_storage_path_id: Optional[int] = None
    filter_has_not_storage_path_ids: Optional[List[int]] = None
    schedule_date_field: Optional[str] = None
    schedule_offset_days: Optional[int] = None
    schedule_is_recurring: Optional[bool] = None
    schedule_recurring_interval_days: Optional[int] = None


class WorkflowTriggerResponse(BaseModel):
    """API response for a workflow trigger."""

    id: int
    type: int
    filter_sources: Optional[List[str]] = None
    filter_filename: Optional[str] = None
    filter_path: Optional[str] = None
    match: Optional[str] = None
    matching_algorithm: int = 0
    is_insensitive: bool = True
    filter_has_tag_ids: Optional[List[int]] = None
    filter_has_all_tag_ids: Optional[List[int]] = None
    filter_has_not_tag_ids: Optional[List[int]] = None
    filter_has_document_type_id: Optional[int] = None
    filter_has_not_document_type_ids: Optional[List[int]] = None
    filter_has_correspondent_id: Optional[int] = None
    filter_has_not_correspondent_ids: Optional[List[int]] = None
    filter_has_storage_path_id: Optional[int] = None
    filter_has_not_storage_path_ids: Optional[List[int]] = None
    schedule_date_field: Optional[str] = None
    schedule_offset_days: int = 0
    schedule_is_recurring: bool = False
    schedule_recurring_interval_days: int = 1
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# WorkflowAction schemas
# ---------------------------------------------------------------------------

class WorkflowActionCreate(BaseModel):
    """Create a workflow action."""

    type: int = Field(..., ge=1, le=4, description="1=ASSIGNMENT, 2=REMOVAL, 3=EMAIL, 4=WEBHOOK")

    # Assignment fields
    assign_title: Optional[str] = None
    assign_tag_ids: Optional[List[int]] = None
    assign_correspondent_id: Optional[int] = None
    assign_document_type_id: Optional[int] = None
    assign_storage_path_id: Optional[int] = None
    assign_owner_id: Optional[int] = None

    # Removal fields
    remove_tag_ids: Optional[List[int]] = None
    remove_all_tags: bool = False
    remove_correspondent: bool = False
    remove_document_type: bool = False
    remove_storage_path: bool = False

    # Email fields
    email_subject: Optional[str] = None
    email_body: Optional[str] = None
    email_to: Optional[str] = None

    # Webhook fields
    webhook_url: Optional[str] = None
    webhook_headers: Optional[dict] = None
    webhook_body: Optional[dict] = None


class WorkflowActionUpdate(BaseModel):
    """Update a workflow action — all fields optional."""

    type: Optional[int] = None
    assign_title: Optional[str] = None
    assign_tag_ids: Optional[List[int]] = None
    assign_correspondent_id: Optional[int] = None
    assign_document_type_id: Optional[int] = None
    assign_storage_path_id: Optional[int] = None
    assign_owner_id: Optional[int] = None
    remove_tag_ids: Optional[List[int]] = None
    remove_all_tags: Optional[bool] = None
    remove_correspondent: Optional[bool] = None
    remove_document_type: Optional[bool] = None
    remove_storage_path: Optional[bool] = None
    email_subject: Optional[str] = None
    email_body: Optional[str] = None
    email_to: Optional[str] = None
    webhook_url: Optional[str] = None
    webhook_headers: Optional[dict] = None
    webhook_body: Optional[dict] = None


class WorkflowActionResponse(BaseModel):
    """API response for a workflow action."""

    id: int
    type: int
    assign_title: Optional[str] = None
    assign_tag_ids: Optional[List[int]] = None
    assign_correspondent_id: Optional[int] = None
    assign_document_type_id: Optional[int] = None
    assign_storage_path_id: Optional[int] = None
    assign_owner_id: Optional[int] = None
    remove_tag_ids: Optional[List[int]] = None
    remove_all_tags: bool = False
    remove_correspondent: bool = False
    remove_document_type: bool = False
    remove_storage_path: bool = False
    email_subject: Optional[str] = None
    email_body: Optional[str] = None
    email_to: Optional[str] = None
    webhook_url: Optional[str] = None
    webhook_headers: Optional[dict] = None
    webhook_body: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Workflow schemas
# ---------------------------------------------------------------------------

class WorkflowCreate(BaseModel):
    """
    Create a workflow with nested triggers and actions.
    All triggers and actions are created in a single transaction.
    """

    name: str = Field(..., max_length=256)
    order: int = 0
    enabled: bool = True
    triggers: List[WorkflowTriggerCreate] = Field(..., min_length=1)
    actions: List[WorkflowActionCreate] = Field(..., min_length=1)


class WorkflowUpdate(BaseModel):
    """
    Update a workflow. Triggers and actions are replaced entirely
    if provided (delete old, create new).
    """

    name: Optional[str] = None
    order: Optional[int] = None
    enabled: Optional[bool] = None
    triggers: Optional[List[WorkflowTriggerCreate]] = None
    actions: Optional[List[WorkflowActionCreate]] = None


class WorkflowResponse(BaseModel):
    """API response for a workflow."""

    id: int
    name: str
    order: int
    enabled: bool
    triggers: List[WorkflowTriggerResponse] = []
    actions: List[WorkflowActionResponse] = []
    run_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WorkflowListResponse(BaseModel):
    """Lightweight list response (no nested details)."""

    id: int
    name: str
    order: int
    enabled: bool
    trigger_count: int = 0
    action_count: int = 0
    run_count: int = 0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# WorkflowRun schemas
# ---------------------------------------------------------------------------

class WorkflowRunResponse(BaseModel):
    """API response for a workflow execution record."""

    id: int
    workflow_id: int
    document_id: Optional[int] = None
    trigger_type: int
    run_at: datetime

    class Config:
        from_attributes = True
