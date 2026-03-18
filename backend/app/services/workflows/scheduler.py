"""
Scheduled workflow evaluator — Celery periodic task.

Sourced from Paperless-ngx tasks.py L391-517.
Runs every 15 minutes via Celery Beat. Finds enabled workflows with
SCHEDULED triggers, calculates date thresholds, and fires matching
workflows against qualifying documents.
"""

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, and_

from app.services.background.celery_app import celery_app
from app.db.session import SessionLocal
from app.models.workflow import (
    Workflow, WorkflowRun,
    WorkflowTriggerType, WorkflowActionType,
)
from app.models.document import Document

logger = logging.getLogger(__name__)


@celery_app.task(name="workflows.check_scheduled_workflows", bind=True)
def check_scheduled_workflows(self):
    """
    Evaluate time-based workflow triggers.

    Sourced from Paperless tasks.py L391-517.

    Flow:
        1. Find all enabled workflows with SCHEDULED triggers
        2. For each trigger: threshold = now - offset_days
        3. Query documents where date_field <= threshold
        4. Check WorkflowRun for already-ran or interval constraints
        5. Execute matching workflows via sync engine path
    """
    with SessionLocal() as db:
        now = datetime.now(timezone.utc)

        # Get all workflows (eager-loaded triggers via query)
        all_workflows = db.execute(
            select(Workflow).where(Workflow.enabled == True)  # noqa: E712
        ).scalars().all()

        # Filter to those with SCHEDULED triggers
        scheduled_workflows = []
        for wf in all_workflows:
            for t in wf.triggers:
                if t.type == WorkflowTriggerType.SCHEDULED:
                    scheduled_workflows.append(wf)
                    break

        if not scheduled_workflows:
            return "No scheduled workflows"

        logger.info("Checking %d scheduled workflow(s)", len(scheduled_workflows))
        total_fired = 0

        for workflow in scheduled_workflows:
            for trigger in workflow.triggers:
                if trigger.type != WorkflowTriggerType.SCHEDULED:
                    continue

                offset = timedelta(days=trigger.schedule_offset_days)
                threshold = now - offset

                # Map date_field to Document column
                # "added" maps to created_at (Synapse equivalent of Paperless "added")
                date_field = trigger.schedule_date_field or "added"

                if date_field == "added":
                    date_col = Document.created_at
                elif date_field == "created":
                    date_col = Document.created_date
                elif date_field == "modified":
                    date_col = Document.updated_at
                else:
                    logger.warning(
                        "Unknown schedule_date_field '%s' on trigger %d",
                        date_field, trigger.id,
                    )
                    continue

                # Query matching documents
                # Only non-deleted documents owned by the trigger's user
                doc_stmt = select(Document).where(
                    and_(
                        Document.deleted_at.is_(None),
                        Document.user_id == trigger.user_id,
                        date_col <= threshold,
                    )
                )
                docs = db.execute(doc_stmt).scalars().all()

                logger.debug(
                    "Trigger %d: %d docs where %s <= %s (offset=%dd)",
                    trigger.id, len(docs), date_field,
                    threshold.isoformat(), trigger.schedule_offset_days,
                )

                for doc in docs:
                    # Check existing workflow runs
                    runs_stmt = (
                        select(WorkflowRun)
                        .where(and_(
                            WorkflowRun.document_id == doc.id,
                            WorkflowRun.workflow_id == workflow.id,
                            WorkflowRun.trigger_type == WorkflowTriggerType.SCHEDULED,
                        ))
                        .order_by(WorkflowRun.run_at.desc())
                    )
                    runs = db.execute(runs_stmt).scalars().all()

                    # Non-recurring: skip if already ran
                    if not trigger.schedule_is_recurring and runs:
                        continue

                    # Recurring: skip if too soon
                    if trigger.schedule_is_recurring and runs:
                        last_run = runs[0].run_at
                        interval = timedelta(
                            days=max(trigger.schedule_recurring_interval_days, 1),
                        )
                        if last_run > now - interval:
                            continue

                    # Execute workflow synchronously
                    fired = _run_workflow_sync(workflow, doc, db)
                    total_fired += fired

        db.commit()

    return f"Checked {len(scheduled_workflows)} workflows, fired {total_fired}"


def _run_workflow_sync(workflow: Workflow, document, db) -> int:
    """
    Synchronous workflow execution for Celery workers.

    Simplified from the async run_workflows — only executes one specific
    workflow against one specific document. Email/webhook actions are
    queued as async tasks, not awaited.
    """
    fired = 0

    for action in workflow.actions:
        try:
            action_type = WorkflowActionType(action.type)

            if action_type == WorkflowActionType.ASSIGNMENT:
                _sync_assignment(action, document, db)
            elif action_type == WorkflowActionType.REMOVAL:
                _sync_removal(action, document)
            elif action_type == WorkflowActionType.EMAIL:
                _sync_email(action, document)
            elif action_type == WorkflowActionType.WEBHOOK:
                _sync_webhook(action, document)

        except Exception as e:
            logger.error(
                "Scheduled action %d failed: %s", action.id, e, exc_info=True,
            )

    # Log execution
    run = WorkflowRun(
        workflow_id=workflow.id,
        document_id=document.id,
        trigger_type=WorkflowTriggerType.SCHEDULED,
    )
    db.add(run)
    fired = 1

    logger.info(
        "Scheduled workflow '%s' fired for document %d",
        workflow.name, document.id,
    )
    return fired


def _sync_assignment(action, document, db):
    """Sync assignment action execution."""
    if action.assign_tag_ids:
        from app.models.tag import Tag
        existing_ids = {t.id for t in document.tags} if document.tags else set()
        for tag_id in action.assign_tag_ids:
            if tag_id not in existing_ids:
                tag = db.get(Tag, tag_id)
                if tag:
                    document.tags.append(tag)

    if action.assign_correspondent_id is not None:
        document.correspondent_id = action.assign_correspondent_id
    if action.assign_document_type_id is not None:
        document.document_type_id = action.assign_document_type_id
    if action.assign_storage_path_id is not None:
        document.storage_path_id = action.assign_storage_path_id
    if action.assign_owner_id is not None:
        document.user_id = action.assign_owner_id
    if action.assign_title:
        document.filename = action.assign_title[:256]


def _sync_removal(action, document):
    """Sync removal action execution."""
    if action.remove_all_tags:
        if hasattr(document, "tags"):
            document.tags.clear()
    elif action.remove_tag_ids:
        remove_set = set(action.remove_tag_ids)
        document.tags = [t for t in document.tags if t.id not in remove_set]

    if action.remove_correspondent:
        document.correspondent_id = None
    if action.remove_document_type:
        document.document_type_id = None
    if action.remove_storage_path:
        document.storage_path_id = None


def _sync_email(action, document):
    """Queue email via Celery (non-blocking)."""
    if not action.email_to:
        return
    subject = action.email_subject or f"Workflow: {document.filename}"
    body = action.email_body or f"Document '{document.filename}' matched a workflow."
    celery_app.send_task(
        "app.services.background.tasks.send_email_task",
        args=[action.email_to, subject, body],
        queue="emails",
    )


def _sync_webhook(action, document):
    """Queue webhook via Celery task or fire directly."""
    if not action.webhook_url:
        return
    import requests
    payload = dict(action.webhook_body) if action.webhook_body else {}
    payload["document_id"] = document.id
    payload["document_filename"] = document.filename
    headers = dict(action.webhook_headers) if action.webhook_headers else {}
    try:
        resp = requests.post(
            action.webhook_url, json=payload, headers=headers, timeout=30,
        )
        logger.info(
            "Scheduled webhook to %s: status=%d", action.webhook_url, resp.status_code,
        )
    except Exception as e:
        logger.error("Scheduled webhook failed: %s", e, exc_info=True)
