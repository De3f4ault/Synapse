# 06 — Workflow & Automation Engine

> **Goal**: Build a trigger-action workflow engine sourced from Paperless-ngx's workflow system.

---

## Source of Truth: Paperless Implementation

### Key Paperless Files

| File | Lines | What We're Sourcing |
|---|---|---|
| [models.py](file:///home/de3f4ault/Desktop/Projects/synapse/tests/paperless-ngx/src/documents/models.py) L980-1583 | 603 | `Workflow`, `WorkflowTrigger`, `WorkflowAction`, `WorkflowRun` models |
| [signals/handlers.py](file:///home/de3f4ault/Desktop/Projects/synapse/tests/paperless-ngx/src/documents/signals/handlers.py) L1100-1546 | 446 | `run_workflows()`, action execution for each type |
| [tasks.py](file:///home/de3f4ault/Desktop/Projects/synapse/tests/paperless-ngx/src/documents/tasks.py) L391-517 | 126 | `check_scheduled_workflows()` — scheduled trigger evaluation |
| [matching.py](file:///home/de3f4ault/Desktop/Projects/synapse/tests/paperless-ngx/src/documents/matching.py) L600-647 | 47 | `prefilter_documents_by_workflowtrigger()` — workflow-specific filtering |
| [consumer.py](file:///home/de3f4ault/Desktop/Projects/synapse/tests/paperless-ngx/src/documents/consumer.py) L200-260 | 60 | `WorkflowTriggerPlugin` — consumption-time trigger evaluation |

### Paperless WorkflowTrigger Model

From [models.py:980-1150](file:///home/de3f4ault/Desktop/Projects/synapse/tests/paperless-ngx/src/documents/models.py):

```python
class WorkflowTrigger(models.Model):
    class WorkflowTriggerType(models.IntegerChoices):
        CONSUMPTION = 1, _("Consumption")
        DOCUMENT_ADDED = 2, _("Document Added")
        DOCUMENT_UPDATED = 3, _("Document Updated")
        SCHEDULED = 4, _("Scheduled")

    class DocumentSourceChoices(models.IntegerChoices):
        CONSUME_FOLDER = 1
        API_UPLOAD = 2
        MAIL_FETCH = 3

    class ScheduleDateField(models.TextChoices):
        CREATED = "created"
        ADDED = "added"
        MODIFIED = "modified"
        CUSTOM_FIELD = "custom_field"

    type = models.PositiveIntegerField(choices=WorkflowTriggerType.choices)
    sources = MultiSelectField(choices=DocumentSourceChoices.choices)

    # Content matching (same as MatchingModel)
    filter_filename = models.CharField(max_length=256, blank=True, null=True)
    filter_path = models.CharField(max_length=256, blank=True, null=True)
    filter_mailrule = models.ForeignKey("MailRule", blank=True, null=True)

    # Tag/Type/Correspondent filters
    filter_has_tags = models.ManyToManyField(Tag, blank=True, related_name="+")
    filter_has_not_tags = models.ManyToManyField(Tag, blank=True, related_name="+")
    filter_has_document_type = models.ForeignKey(DocumentType, blank=True, null=True)
    filter_has_correspondent = models.ForeignKey(Correspondent, blank=True, null=True)

    # Matching (like MatchingModel)
    match = models.CharField(max_length=256, blank=True)
    matching_algorithm = models.PositiveIntegerField(default=MatchingModel.MATCH_NONE)
    is_insensitive = models.BooleanField(default=True)

    # Schedule config
    schedule_date_field = models.CharField(max_length=50, blank=True, null=True)
    schedule_offset_days = models.IntegerField(default=0)
    schedule_is_recurring = models.BooleanField(default=False)
    schedule_recurring_interval_days = models.IntegerField(default=0)
    schedule_date_custom_field = models.ForeignKey("CustomField", blank=True, null=True)
```

### Paperless WorkflowAction Model

```python
class WorkflowAction(models.Model):
    class WorkflowActionType(models.IntegerChoices):
        ASSIGNMENT = 1
        REMOVAL = 2
        EMAIL = 3
        WEBHOOK = 4

    type = models.PositiveIntegerField(choices=WorkflowActionType.choices)

    # Assignment fields
    assign_title = models.CharField(max_length=256, blank=True, null=True)
    assign_tags = models.ManyToManyField(Tag, blank=True)
    assign_correspondent = models.ForeignKey(Correspondent, blank=True, null=True)
    assign_document_type = models.ForeignKey(DocumentType, blank=True, null=True)
    assign_storage_path = models.ForeignKey(StoragePath, blank=True, null=True)
    assign_owner = models.ForeignKey(User, blank=True, null=True)
    assign_view_users = models.ManyToManyField(User, blank=True, related_name="+")
    assign_view_groups = models.ManyToManyField(Group, blank=True, related_name="+")
    assign_change_users = models.ManyToManyField(User, blank=True, related_name="+")
    assign_change_groups = models.ManyToManyField(Group, blank=True, related_name="+")
    assign_custom_fields = models.ManyToManyField("CustomField", blank=True)

    # Removal fields
    remove_tags = models.ManyToManyField(Tag, blank=True, related_name="+")
    remove_correspondents = models.ManyToManyField(Correspondent, blank=True)
    remove_document_types = models.ManyToManyField(DocumentType, blank=True)
    remove_storage_paths = models.ManyToManyField(StoragePath, blank=True)
    remove_owners = models.ManyToManyField(User, blank=True, related_name="+")
    remove_custom_fields = models.ManyToManyField("CustomField", blank=True, related_name="+")

    # Email config
    email_subject = models.CharField(max_length=256, blank=True, null=True)
    email_body = models.TextField(blank=True, null=True)
    email_to = models.CharField(max_length=512, blank=True, null=True)
    email_include_document = models.BooleanField(default=False)

    # Webhook config
    webhook_url = models.URLField(max_length=512, blank=True, null=True)
    webhook_headers = models.JSONField(default=dict, blank=True, null=True)
    webhook_body = models.JSONField(default=dict, blank=True, null=True)
    webhook_params = models.JSONField(default=dict, blank=True, null=True)
    webhook_include_document = models.BooleanField(default=False)
```

### Paperless Scheduled Workflow Evaluation

From [tasks.py:391-517](file:///home/de3f4ault/Desktop/Projects/synapse/tests/paperless-ngx/src/documents/tasks.py#L391-L517) — the `check_scheduled_workflows()` task:

```python
@shared_task
def check_scheduled_workflows():
    scheduled_workflows = Workflow.objects.filter(
        triggers__type=WorkflowTrigger.WorkflowTriggerType.SCHEDULED,
        enabled=True,
    ).distinct().prefetch_related("triggers")

    now = timezone.now()
    for workflow in scheduled_workflows:
        for trigger in workflow.triggers.filter(type=WorkflowTrigger.WorkflowTriggerType.SCHEDULED):
            offset_td = timedelta(days=trigger.schedule_offset_days)
            threshold = now - offset_td

            # Find documents matching the date condition
            match trigger.schedule_date_field:
                case "added":  documents = Document.objects.filter(added__lte=threshold)
                case "created": documents = Document.objects.filter(created__lte=threshold)
                case "modified": documents = Document.objects.filter(modified__lte=threshold)
                case "custom_field": ...  # CustomFieldInstance date lookup

            # Apply content/tag filters
            documents = prefilter_documents_by_workflowtrigger(documents, trigger)

            for document in documents:
                # Check if already run (non-recurring) or interval elapsed (recurring)
                workflow_runs = WorkflowRun.objects.filter(
                    document=document, workflow=workflow,
                    type=WorkflowTrigger.WorkflowTriggerType.SCHEDULED,
                ).order_by("-run_at")

                if not trigger.schedule_is_recurring and workflow_runs.exists():
                    continue  # Already ran for this document

                if trigger.schedule_is_recurring and workflow_runs.exists():
                    last_run = workflow_runs.last().run_at
                    if last_run > now - timedelta(days=trigger.schedule_recurring_interval_days):
                        continue  # Too soon to run again

                run_workflows(
                    trigger_type=WorkflowTrigger.WorkflowTriggerType.SCHEDULED,
                    workflow_to_run=workflow,
                    document=document,
                )
```

### Paperless Action Execution

From [signals/handlers.py](file:///home/de3f4ault/Desktop/Projects/synapse/tests/paperless-ngx/src/documents/signals/handlers.py) `run_workflows()`:

```python
def run_workflows(trigger_type, document, workflow_to_run=None, **kwargs):
    workflows = Workflow.objects.filter(enabled=True).order_by("order")
    if workflow_to_run:
        workflows = workflows.filter(pk=workflow_to_run.pk)

    for workflow in workflows:
        for trigger in workflow.triggers.filter(type=trigger_type):
            if not _trigger_matches(trigger, document, **kwargs):
                continue

            for action in workflow.actions.all():
                if action.type == WorkflowAction.WorkflowActionType.ASSIGNMENT:
                    # Set tags, correspondent, type, storage_path, owner, permissions
                    if action.assign_tags.exists():
                        document.tags.add(*action.assign_tags.all())
                    if action.assign_correspondent:
                        document.correspondent = action.assign_correspondent
                    if action.assign_document_type:
                        document.document_type = action.assign_document_type
                    if action.assign_owner:
                        document.owner = action.assign_owner

                elif action.type == WorkflowAction.WorkflowActionType.REMOVAL:
                    if action.remove_tags.exists():
                        document.tags.remove(*action.remove_tags.all())
                    if action.remove_correspondents.exists():
                        document.correspondent = None

                elif action.type == WorkflowAction.WorkflowActionType.EMAIL:
                    send_email(action.email_to, action.email_subject, action.email_body, document)

                elif action.type == WorkflowAction.WorkflowActionType.WEBHOOK:
                    send_webhook(action.webhook_url, action.webhook_headers, action.webhook_body, document)

            # Log execution
            WorkflowRun.objects.create(
                workflow=workflow, document=document,
                type=trigger_type, run_at=timezone.now(),
            )
            document.save()
```

---

## Synapse Files Being Modified

| File | Current State | Change |
|---|---|---|
| **New file**: `models/workflow.py` | Does not exist | **Create**: `Workflow`, `WorkflowTrigger`, `WorkflowAction`, `WorkflowRun` |
| **New file**: `services/workflows/engine.py` | Does not exist | **Create**: `run_workflows()`, `_trigger_matches()`, `_execute_action()` |
| **New file**: `services/workflows/scheduler.py` | Does not exist | **Create**: `check_scheduled_workflows()` task |
| **New file**: `api/rest/workflows.py` | Does not exist | **Create**: CRUD endpoints for workflows |
| [consumer.py plugin](file:///home/de3f4ault/Desktop/Projects/synapse/tests/dms-architecture-overhaul/02-ingestion-pipeline.md) | `WorkflowTriggerPlugin` defined in pipeline doc | **Implement**: Wire to workflow engine |
| `services/ingestion/signals.py` | Does not exist (defined in pipeline doc) | **Wire**: `document_consumed` signal → `run_workflows()` |

---

## Synapse Implementation

### Data Models

```python
# backend/app/models/workflow.py

import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String, Integer, Boolean, Text, ForeignKey, DateTime, Table, Column, ARRAY
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from .base import Base
from .mixins import TimestampMixin, UserOwnedMixin


class WorkflowTriggerType(int, enum.Enum):
    CONSUMPTION = 1      # Fired during ingestion pipeline
    DOCUMENT_ADDED = 2   # Fired after document saved to DB
    DOCUMENT_UPDATED = 3 # Fired on metadata change
    SCHEDULED = 4        # Time-based, evaluated by periodic task


class WorkflowActionType(int, enum.Enum):
    ASSIGNMENT = 1       # Set tags, type, correspondent, owner
    REMOVAL = 2          # Remove tags, type, correspondent
    EMAIL = 3            # Send email notification
    WEBHOOK = 4          # HTTP callback


class WorkflowTrigger(Base, TimestampMixin, UserOwnedMixin):
    """
    Sourced from Paperless models.py:980-1150.

    A trigger defines WHEN a workflow fires and WHAT documents it applies to.
    """
    __tablename__ = "workflow_triggers"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    type: Mapped[int] = mapped_column(Integer, nullable=False)

    # Source filters (for CONSUMPTION triggers)
    filter_sources: Mapped[Optional[list]] = mapped_column(
        ARRAY(String), nullable=True,
        doc="['api_upload', 'watched_folder', 'mail']"
    )
    filter_filename: Mapped[Optional[str]] = mapped_column(
        String(256), nullable=True,
        doc="Glob pattern: *.pdf, invoice_*"
    )
    filter_path: Mapped[Optional[str]] = mapped_column(
        String(256), nullable=True,
        doc="Path prefix filter"
    )

    # Content matching (same as MatchingModel)
    match: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    matching_algorithm: Mapped[int] = mapped_column(Integer, default=0)
    is_insensitive: Mapped[bool] = mapped_column(Boolean, default=True)

    # Tag/Type/Correspondent filters
    filter_has_tag_ids: Mapped[Optional[list]] = mapped_column(
        ARRAY(Integer), nullable=True
    )
    filter_has_not_tag_ids: Mapped[Optional[list]] = mapped_column(
        ARRAY(Integer), nullable=True
    )
    filter_has_document_type_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("document_types.id", ondelete="SET NULL"), nullable=True
    )
    filter_has_correspondent_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("correspondents.id", ondelete="SET NULL"), nullable=True
    )

    # Schedule config (for SCHEDULED triggers)
    schedule_date_field: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True,
        doc="'created_date', 'created_at', 'updated_at', 'custom_field'"
    )
    schedule_offset_days: Mapped[int] = mapped_column(Integer, default=0)
    schedule_is_recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    schedule_recurring_interval_days: Mapped[int] = mapped_column(Integer, default=0)


class WorkflowAction(Base, TimestampMixin, UserOwnedMixin):
    """
    Sourced from Paperless models.py:1150-1350.

    An action defines WHAT happens when a workflow fires.
    """
    __tablename__ = "workflow_actions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    type: Mapped[int] = mapped_column(Integer, nullable=False)

    # Assignment fields
    assign_title: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    assign_tag_ids: Mapped[Optional[list]] = mapped_column(ARRAY(Integer), nullable=True)
    assign_correspondent_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("correspondents.id", ondelete="SET NULL"), nullable=True
    )
    assign_document_type_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("document_types.id", ondelete="SET NULL"), nullable=True
    )
    assign_storage_path_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("storage_paths.id", ondelete="SET NULL"), nullable=True
    )
    assign_owner_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Removal fields
    remove_tag_ids: Mapped[Optional[list]] = mapped_column(ARRAY(Integer), nullable=True)
    remove_correspondent: Mapped[bool] = mapped_column(Boolean, default=False)
    remove_document_type: Mapped[bool] = mapped_column(Boolean, default=False)

    # Email config
    email_subject: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    email_body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    email_to: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    email_include_document: Mapped[bool] = mapped_column(Boolean, default=False)

    # Webhook config
    webhook_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    webhook_headers: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    webhook_body: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    webhook_include_document: Mapped[bool] = mapped_column(Boolean, default=False)


# Workflow ↔ Trigger/Action M2M tables
workflow_triggers_assoc = Table(
    "workflow_workflow_triggers", Base.metadata,
    Column("workflow_id", Integer, ForeignKey("workflows.id", ondelete="CASCADE"), primary_key=True),
    Column("trigger_id", Integer, ForeignKey("workflow_triggers.id", ondelete="CASCADE"), primary_key=True),
)

workflow_actions_assoc = Table(
    "workflow_workflow_actions", Base.metadata,
    Column("workflow_id", Integer, ForeignKey("workflows.id", ondelete="CASCADE"), primary_key=True),
    Column("action_id", Integer, ForeignKey("workflow_actions.id", ondelete="CASCADE"), primary_key=True),
)


class Workflow(Base, TimestampMixin, UserOwnedMixin):
    """
    Sourced from Paperless models.py:1350-1400.
    """
    __tablename__ = "workflows"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    triggers: Mapped[list["WorkflowTrigger"]] = relationship(
        secondary=workflow_triggers_assoc
    )
    actions: Mapped[list["WorkflowAction"]] = relationship(
        secondary=workflow_actions_assoc
    )


class WorkflowRun(Base, TimestampMixin):
    """
    Audit log of workflow executions.
    Sourced from Paperless models.py:1400-1430.
    """
    __tablename__ = "workflow_runs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    workflow_id: Mapped[int] = mapped_column(
        ForeignKey("workflows.id", ondelete="CASCADE"), index=True
    )
    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), index=True
    )
    trigger_type: Mapped[int] = mapped_column(Integer, nullable=False)
    run_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    workflow: Mapped["Workflow"] = relationship()
    document: Mapped["Document"] = relationship()
```

### Workflow Execution Engine

```python
# backend/app/services/workflows/engine.py

import logging
import re
import fnmatch
from typing import Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workflow import (
    Workflow, WorkflowTrigger, WorkflowAction, WorkflowRun,
    WorkflowTriggerType, WorkflowActionType,
)
from app.services.classification.matching import matches as content_matches

logger = logging.getLogger(__name__)


async def run_workflows(
    trigger_type: int,
    document_id: int,
    db: AsyncSession,
    *,
    workflow_to_run: Optional[int] = None,
    source: Optional[str] = None,
    filename: Optional[str] = None,
):
    """
    Evaluate and execute matching workflows for a document.

    Sourced from Paperless signals/handlers.py run_workflows():
    - Iterates workflows in order
    - For each trigger, checks if it matches the document
    - Executes all actions for matching workflows
    - Logs each execution in WorkflowRun

    Args:
        trigger_type: When this fires (CONSUMPTION=1, ADDED=2, UPDATED=3, SCHEDULED=4)
        document_id: The document being processed
        db: Database session
        workflow_to_run: If set, evaluate only this specific workflow
        source: Ingestion source (for CONSUMPTION triggers)
        filename: Original filename (for CONSUMPTION triggers)
    """
    from app.models.document import Document

    document = await db.get(Document, document_id)
    if not document:
        logger.error(f"Document {document_id} not found for workflow evaluation")
        return

    # Get matching workflows
    query = (
        select(Workflow)
        .where(Workflow.enabled == True, Workflow.user_id == document.user_id)
        .order_by(Workflow.order)
    )
    if workflow_to_run:
        query = query.where(Workflow.id == workflow_to_run)

    result = await db.execute(query)
    workflows = result.scalars().all()

    for workflow in workflows:
        for trigger in workflow.triggers:
            if trigger.type != trigger_type:
                continue

            if not await _trigger_matches(trigger, document, db, source=source, filename=filename):
                continue

            logger.info(
                f"Workflow '{workflow.name}' triggered for document {document_id} "
                f"(trigger type={trigger_type})"
            )

            # Execute all actions
            for action in workflow.actions:
                await _execute_action(action, document, db)

            # Log execution
            run = WorkflowRun(
                workflow_id=workflow.id,
                document_id=document_id,
                trigger_type=trigger_type,
            )
            db.add(run)

    await db.commit()


async def _trigger_matches(
    trigger: WorkflowTrigger,
    document,
    db: AsyncSession,
    *,
    source: Optional[str] = None,
    filename: Optional[str] = None,
) -> bool:
    """
    Check if a trigger matches the given document.

    Sourced from Paperless matching.py prefilter_documents_by_workflowtrigger().
    """
    # Source filter (CONSUMPTION only)
    if trigger.filter_sources and source:
        if source not in trigger.filter_sources:
            return False

    # Filename filter (glob pattern)
    if trigger.filter_filename:
        fn = filename or document.filename
        if not fnmatch.fnmatch(fn, trigger.filter_filename):
            return False

    # Path filter
    if trigger.filter_path:
        if not document.file_path.startswith(trigger.filter_path):
            return False

    # Tag filter: must have these tags
    if trigger.filter_has_tag_ids:
        doc_tag_ids = {t.id for t in document.tags}
        if not set(trigger.filter_has_tag_ids).issubset(doc_tag_ids):
            return False

    # Tag filter: must NOT have these tags
    if trigger.filter_has_not_tag_ids:
        doc_tag_ids = {t.id for t in document.tags}
        if set(trigger.filter_has_not_tag_ids).intersection(doc_tag_ids):
            return False

    # Document type filter
    if trigger.filter_has_document_type_id:
        if document.document_type_id != trigger.filter_has_document_type_id:
            return False

    # Correspondent filter
    if trigger.filter_has_correspondent_id:
        if document.correspondent_id != trigger.filter_has_correspondent_id:
            return False

    # Content matching (using same matching engine as classification)
    if trigger.match and trigger.matching_algorithm > 0:
        content = document.content_text or ""
        if not content_matches(trigger, content):
            return False

    return True


async def _execute_action(
    action: WorkflowAction,
    document,
    db: AsyncSession,
):
    """
    Execute a single workflow action on a document.

    Sourced from Paperless signals/handlers.py run_workflows() action loop.
    """
    if action.type == WorkflowActionType.ASSIGNMENT:
        # Assign tags
        if action.assign_tag_ids:
            from app.models.tag import Tag
            for tag_id in action.assign_tag_ids:
                tag = await db.get(Tag, tag_id)
                if tag and tag not in document.tags:
                    document.tags.append(tag)

        # Assign correspondent
        if action.assign_correspondent_id:
            document.correspondent_id = action.assign_correspondent_id

        # Assign document type
        if action.assign_document_type_id:
            document.document_type_id = action.assign_document_type_id

        # Assign storage path
        if action.assign_storage_path_id:
            document.storage_path_id = action.assign_storage_path_id

        # Assign owner
        if action.assign_owner_id:
            document.user_id = action.assign_owner_id

        # Assign title
        if action.assign_title:
            document.filename = action.assign_title

    elif action.type == WorkflowActionType.REMOVAL:
        if action.remove_tag_ids:
            document.tags = [t for t in document.tags if t.id not in action.remove_tag_ids]
        if action.remove_correspondent:
            document.correspondent_id = None
        if action.remove_document_type:
            document.document_type_id = None

    elif action.type == WorkflowActionType.EMAIL:
        await _send_email_action(action, document)

    elif action.type == WorkflowActionType.WEBHOOK:
        await _send_webhook_action(action, document)


async def _send_email_action(action: WorkflowAction, document):
    """Send email notification for a workflow action."""
    from app.services.notification.service import send_email
    await send_email(
        to=action.email_to,
        subject=action.email_subject or f"Workflow: {document.filename}",
        body=action.email_body or f"Document '{document.filename}' matched a workflow.",
    )


async def _send_webhook_action(action: WorkflowAction, document):
    """Send webhook HTTP callback."""
    import httpx
    payload = action.webhook_body or {}
    payload["document_id"] = document.id
    payload["document_filename"] = document.filename

    async with httpx.AsyncClient(timeout=30) as client:
        await client.post(
            action.webhook_url,
            json=payload,
            headers=action.webhook_headers or {},
        )
```

### Scheduled Workflow Task

```python
# backend/app/services/workflows/scheduler.py

from celery import shared_task
from datetime import datetime, timedelta
from sqlalchemy import select

from app.models.workflow import (
    Workflow, WorkflowTrigger, WorkflowRun, WorkflowTriggerType,
)
from app.models.document import Document

import logging
logger = logging.getLogger(__name__)


@shared_task
def check_scheduled_workflows():
    """
    Evaluate time-based workflow triggers.

    Sourced from Paperless tasks.py:391-517 check_scheduled_workflows().

    This runs every 15 minutes via Celery Beat. It:
    1. Finds all enabled workflows with SCHEDULED triggers
    2. For each trigger, calculates the threshold date (now - offset_days)
    3. Finds documents where the specified date field <= threshold
    4. Checks recurring/non-recurring constraints
    5. Applies content/tag filters
    6. Executes matching workflows
    """
    from app.services.workflows.engine import run_workflows

    with get_sync_session() as db:
        now = datetime.utcnow()

        scheduled_workflows = db.execute(
            select(Workflow).where(
                Workflow.enabled == True,
            )
        ).scalars().all()

        # Filter to only those with SCHEDULED triggers
        scheduled_workflows = [
            w for w in scheduled_workflows
            if any(t.type == WorkflowTriggerType.SCHEDULED for t in w.triggers)
        ]

        if not scheduled_workflows:
            return "No scheduled workflows"

        logger.debug(f"Checking {len(scheduled_workflows)} scheduled workflows")

        for workflow in scheduled_workflows:
            for trigger in workflow.triggers:
                if trigger.type != WorkflowTriggerType.SCHEDULED:
                    continue

                offset = timedelta(days=trigger.schedule_offset_days)
                threshold = now - offset

                logger.debug(
                    f"Trigger {trigger.id}: checking {trigger.schedule_date_field} "
                    f"<= {threshold} (offset={trigger.schedule_offset_days}d)"
                )

                # Find matching documents based on date field
                date_field = trigger.schedule_date_field or "created_at"

                if date_field == "created_date":
                    docs = db.execute(
                        select(Document).where(
                            Document.deleted_at.is_(None),
                            Document.created_date <= threshold.date(),
                        )
                    ).scalars().all()
                elif date_field == "created_at":
                    docs = db.execute(
                        select(Document).where(
                            Document.deleted_at.is_(None),
                            Document.created_at <= threshold,
                        )
                    ).scalars().all()
                elif date_field == "updated_at":
                    docs = db.execute(
                        select(Document).where(
                            Document.deleted_at.is_(None),
                            Document.updated_at <= threshold,
                        )
                    ).scalars().all()
                else:
                    continue

                for doc in docs:
                    # Check if already executed
                    runs = db.execute(
                        select(WorkflowRun).where(
                            WorkflowRun.document_id == doc.id,
                            WorkflowRun.workflow_id == workflow.id,
                            WorkflowRun.trigger_type == WorkflowTriggerType.SCHEDULED,
                        ).order_by(WorkflowRun.run_at.desc())
                    ).scalars().all()

                    if not trigger.schedule_is_recurring and runs:
                        continue  # Already ran, non-recurring

                    if trigger.schedule_is_recurring and runs:
                        last_run = runs[0].run_at
                        interval = timedelta(days=trigger.schedule_recurring_interval_days)
                        if last_run > now - interval:
                            continue  # Too soon

                    # Execute workflow
                    run_workflows_sync(
                        trigger_type=WorkflowTriggerType.SCHEDULED,
                        document_id=doc.id,
                        db=db,
                        workflow_to_run=workflow.id,
                    )

        return f"Checked {len(scheduled_workflows)} scheduled workflows"
```

---

## Module Structure

```
backend/app/services/workflows/
├── __init__.py
├── engine.py                  # run_workflows(), _trigger_matches(), _execute_action()
├── scheduler.py               # check_scheduled_workflows() Celery task

backend/app/models/
├── workflow.py                # Workflow, WorkflowTrigger, WorkflowAction, WorkflowRun

backend/app/api/rest/
├── workflows.py               # CRUD endpoints for workflows
```

---

## Engineering Tasks

1. **Create WorkflowTrigger** model — 4 trigger types, filter fields, schedule config
2. **Create WorkflowAction** model — 4 action types, assignment/removal/email/webhook fields
3. **Create Workflow** model — name, order, enabled, M2M to triggers + actions
4. **Create WorkflowRun** audit log model
5. **Implement `run_workflows()`** — trigger matching + action execution loop
6. **Implement `_trigger_matches()`** — source, filename, path, tag, type, content filters
7. **Implement `_execute_action()`** — assignment, removal, email, webhook handlers
8. **Implement `check_scheduled_workflows()`** — Celery periodic task with recurring logic
9. **Wire to post-consumption signal** — `document_consumed` → `run_workflows(CONSUMPTION)`
10. **Wire to document save** — post-save signal → `run_workflows(DOCUMENT_ADDED/UPDATED)`
11. **Add Celery Beat schedule** — `check_scheduled_workflows` every 15 minutes
12. **Create CRUD API endpoints** for workflows, triggers, actions
13. **Write tests** — trigger matching, action execution, schedule evaluation, recurring logic
