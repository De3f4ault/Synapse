"""
Workflow & Automation Engine — Data Models.

Sourced from Paperless-ngx models.py L980-1584.
Simplified: no permissions/ACL, no custom fields, no mail rules.
Email/Webhook inlined on WorkflowAction (not separate FK models).

Models:
    WorkflowTrigger  — WHEN a workflow fires (19 columns)
    WorkflowAction   — WHAT a workflow does (19 columns)
    Workflow         — Named container with M2M to triggers + actions
    WorkflowRun      — Audit log of executions
"""

import enum
from datetime import datetime
from typing import Optional, List

from sqlalchemy import (
    String, Integer, Boolean, Text, ForeignKey, DateTime,
    Table, Column,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import ARRAY, JSONB

from .base import Base
from .mixins import TimestampMixin, UserOwnedMixin


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class WorkflowTriggerType(int, enum.Enum):
    """When the workflow fires. Sourced from Paperless L990-994."""
    CONSUMPTION = 1       # During ingestion pipeline (before indexing)
    DOCUMENT_ADDED = 2    # After document saved + classified
    DOCUMENT_UPDATED = 3  # After document metadata update via API
    SCHEDULED = 4         # Time-based, evaluated by Celery Beat


class WorkflowActionType(int, enum.Enum):
    """What the workflow does. Sourced from Paperless L1273-1289."""
    ASSIGNMENT = 1  # Set tags, type, correspondent, path, owner, title
    REMOVAL = 2     # Remove/clear tags, type, correspondent, path
    EMAIL = 3       # Send email notification
    WEBHOOK = 4     # HTTP POST callback


class DocumentSource(str, enum.Enum):
    """Ingestion source for CONSUMPTION trigger filtering."""
    API_UPLOAD = "api_upload"
    WATCHED_FOLDER = "watched_folder"
    MAIL_FETCH = "mail_fetch"


# ---------------------------------------------------------------------------
# WorkflowTrigger — conditions for firing
# ---------------------------------------------------------------------------

class WorkflowTrigger(Base, TimestampMixin, UserOwnedMixin):
    """
    Defines WHEN a workflow fires and WHAT documents it applies to.

    Sourced from Paperless models.py L980-1183.
    Simplified: M2M tag/type/correspondent/path filters → ARRAY columns.
    Omitted: filter_mailrule, filter_custom_field_query, schedule_date_custom_field.
    """
    __tablename__ = "workflow_triggers"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    type: Mapped[int] = mapped_column(
        Integer, nullable=False, default=WorkflowTriggerType.CONSUMPTION,
        doc="WorkflowTriggerType enum value (1-4)",
    )

    # --- Source filters (CONSUMPTION triggers) ---
    filter_sources: Mapped[Optional[list]] = mapped_column(
        ARRAY(String), nullable=True,
        doc="['api_upload', 'watched_folder', 'mail_fetch']",
    )
    filter_filename: Mapped[Optional[str]] = mapped_column(
        String(256), nullable=True,
        doc="Glob pattern: *.pdf, invoice_*. Case insensitive.",
    )
    filter_path: Mapped[Optional[str]] = mapped_column(
        String(256), nullable=True,
        doc="Path prefix filter",
    )

    # --- Content matching (reuses Phase 3 matching engine) ---
    match: Mapped[Optional[str]] = mapped_column(
        String(256), nullable=True, default="",
        doc="Content matching keywords",
    )
    matching_algorithm: Mapped[int] = mapped_column(
        Integer, default=0, doc="0=NONE, 1=ANY, 2=ALL, 3=LITERAL, 4=REGEX, 5=FUZZY",
    )
    is_insensitive: Mapped[bool] = mapped_column(Boolean, default=True)

    # --- Tag filters (ARRAY instead of M2M) ---
    filter_has_tag_ids: Mapped[Optional[list]] = mapped_column(
        ARRAY(Integer), nullable=True,
        doc="Doc must have AT LEAST ONE of these tags (OR match). Paperless L1062.",
    )
    filter_has_all_tag_ids: Mapped[Optional[list]] = mapped_column(
        ARRAY(Integer), nullable=True,
        doc="Doc must have ALL of these tags (AND match). Paperless L1068.",
    )
    filter_has_not_tag_ids: Mapped[Optional[list]] = mapped_column(
        ARRAY(Integer), nullable=True,
        doc="Doc must NOT have any of these tags. Paperless L1075.",
    )

    # --- Document type filter ---
    filter_has_document_type_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("document_types.id", ondelete="SET NULL"), nullable=True,
        doc="Doc must be this type. Paperless L1082.",
    )
    filter_has_not_document_type_ids: Mapped[Optional[list]] = mapped_column(
        ARRAY(Integer), nullable=True,
        doc="Doc must NOT be any of these types. Paperless L1090.",
    )

    # --- Correspondent filter ---
    filter_has_correspondent_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("correspondents.id", ondelete="SET NULL"), nullable=True,
        doc="Doc must have this correspondent. Paperless L1097.",
    )
    filter_has_not_correspondent_ids: Mapped[Optional[list]] = mapped_column(
        ARRAY(Integer), nullable=True,
        doc="Doc must NOT have these correspondents. Paperless L1105.",
    )

    # --- Storage path filter ---
    filter_has_storage_path_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("storage_paths.id", ondelete="SET NULL"), nullable=True,
        doc="Doc must have this storage path. Paperless L1112.",
    )
    filter_has_not_storage_path_ids: Mapped[Optional[list]] = mapped_column(
        ARRAY(Integer), nullable=True,
        doc="Doc must NOT have these storage paths. Paperless L1120.",
    )

    # --- Schedule config (SCHEDULED triggers only) ---
    schedule_date_field: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True, default="added",
        doc="'added' (created_at), 'created' (created_date), 'modified' (updated_at)",
    )
    schedule_offset_days: Mapped[int] = mapped_column(Integer, default=0)
    schedule_is_recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    schedule_recurring_interval_days: Mapped[int] = mapped_column(
        Integer, default=1, doc="Minimum 1 day between recurring runs",
    )


# ---------------------------------------------------------------------------
# WorkflowAction — what happens when the workflow fires
# ---------------------------------------------------------------------------

class WorkflowAction(Base, TimestampMixin, UserOwnedMixin):
    """
    Defines WHAT a workflow does when it fires.

    Sourced from Paperless models.py L1272-1522, WorkflowActionEmail L1185-1219,
    WorkflowActionWebhook L1222-1269.
    Simplified: email/webhook inlined, no permissions, no custom fields.
    """
    __tablename__ = "workflow_actions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    type: Mapped[int] = mapped_column(
        Integer, nullable=False, default=WorkflowActionType.ASSIGNMENT,
        doc="WorkflowActionType enum value (1-4)",
    )

    # --- Assignment fields (ASSIGNMENT type) ---
    assign_title: Mapped[Optional[str]] = mapped_column(
        String(256), nullable=True, doc="Set document title/filename",
    )
    assign_tag_ids: Mapped[Optional[list]] = mapped_column(
        ARRAY(Integer), nullable=True, doc="Add these tags to document",
    )
    assign_correspondent_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("correspondents.id", ondelete="SET NULL"), nullable=True,
    )
    assign_document_type_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("document_types.id", ondelete="SET NULL"), nullable=True,
    )
    assign_storage_path_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("storage_paths.id", ondelete="SET NULL"), nullable=True,
    )
    assign_owner_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
        doc="Transfer document ownership",
    )

    # --- Removal fields (REMOVAL type) ---
    remove_tag_ids: Mapped[Optional[list]] = mapped_column(
        ARRAY(Integer), nullable=True, doc="Remove specific tags",
    )
    remove_all_tags: Mapped[bool] = mapped_column(
        Boolean, default=False, doc="Clear ALL tags from document",
    )
    remove_correspondent: Mapped[bool] = mapped_column(
        Boolean, default=False, doc="Clear correspondent",
    )
    remove_document_type: Mapped[bool] = mapped_column(
        Boolean, default=False, doc="Clear document type",
    )
    remove_storage_path: Mapped[bool] = mapped_column(
        Boolean, default=False, doc="Clear storage path",
    )

    # --- Email fields (EMAIL type, inlined from WorkflowActionEmail) ---
    email_subject: Mapped[Optional[str]] = mapped_column(
        String(256), nullable=True,
    )
    email_body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    email_to: Mapped[Optional[str]] = mapped_column(
        String(512), nullable=True, doc="Comma-separated email addresses",
    )

    # --- Webhook fields (WEBHOOK type, inlined from WorkflowActionWebhook) ---
    webhook_url: Mapped[Optional[str]] = mapped_column(
        String(256), nullable=True, doc="HTTP POST destination URL",
    )
    webhook_headers: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True, doc="Custom HTTP headers",
    )
    webhook_body: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True, doc="Custom JSON payload (document info auto-added)",
    )


# ---------------------------------------------------------------------------
# M2M Association Tables
# ---------------------------------------------------------------------------

workflow_triggers_assoc = Table(
    "workflow_workflow_triggers",
    Base.metadata,
    Column(
        "workflow_id", Integer,
        ForeignKey("workflows.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "trigger_id", Integer,
        ForeignKey("workflow_triggers.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)

workflow_actions_assoc = Table(
    "workflow_workflow_actions",
    Base.metadata,
    Column(
        "workflow_id", Integer,
        ForeignKey("workflows.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "action_id", Integer,
        ForeignKey("workflow_actions.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


# ---------------------------------------------------------------------------
# Workflow — parent container
# ---------------------------------------------------------------------------

class Workflow(Base, TimestampMixin, UserOwnedMixin):
    """
    Named workflow container with M2M to triggers and actions.
    Sourced from Paperless models.py L1525-1547.
    """
    __tablename__ = "workflows"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(
        String(256), nullable=False, unique=True,
        doc="Workflow display name",
    )
    order: Mapped[int] = mapped_column(
        Integer, default=0, doc="Execution priority (lower = first)",
    )
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    # M2M relationships
    triggers: Mapped[List["WorkflowTrigger"]] = relationship(
        secondary=workflow_triggers_assoc, lazy="selectin",
    )
    actions: Mapped[List["WorkflowAction"]] = relationship(
        secondary=workflow_actions_assoc, lazy="selectin",
    )

    # Audit log
    runs: Mapped[List["WorkflowRun"]] = relationship(
        back_populates="workflow", cascade="all, delete-orphan", lazy="dynamic",
    )


# ---------------------------------------------------------------------------
# WorkflowRun — execution audit log
# ---------------------------------------------------------------------------

class WorkflowRun(Base):
    """
    Audit log of workflow executions.
    Sourced from Paperless models.py L1550-1584.
    """
    __tablename__ = "workflow_runs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    workflow_id: Mapped[int] = mapped_column(
        ForeignKey("workflows.id", ondelete="CASCADE"), index=True,
    )
    document_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), index=True, nullable=True,
    )
    trigger_type: Mapped[int] = mapped_column(Integer, nullable=False)
    run_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()", index=True,
    )

    # Relationships
    workflow: Mapped["Workflow"] = relationship(back_populates="runs")
