"""
Workflow execution engine.

Sourced from Paperless-ngx signals/handlers.py L780-1410 and matching.py L582-647.
Entry point: run_workflows() — evaluates triggers and executes matching actions.
"""

import fnmatch
import logging
from typing import Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workflow import (
    Workflow, WorkflowTrigger, WorkflowAction, WorkflowRun,
    WorkflowTriggerType, WorkflowActionType,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

async def run_workflows(
    trigger_type: int,
    document_id: int,
    db: AsyncSession,
    *,
    workflow_id: Optional[int] = None,
    source: Optional[str] = None,
    filename: Optional[str] = None,
) -> int:
    """
    Evaluate and execute matching workflows for a document.

    Sourced from Paperless handlers.py L1344-1409.

    Flow:
        1. Query enabled workflows for the document's owner, ordered by `order`
        2. For each workflow, check each trigger of the matching type
        3. First matching trigger → execute ALL actions → log WorkflowRun
        4. Continue to next workflow (multiple workflows can fire)

    Args:
        trigger_type: WorkflowTriggerType value (1-4)
        document_id: The document being processed
        db: Async database session
        workflow_id: If set, evaluate only this specific workflow
        source: Ingestion source (for CONSUMPTION triggers)
        filename: Original filename (for CONSUMPTION triggers)

    Returns:
        Number of workflows that fired
    """
    from app.models.document import Document

    document = await db.get(Document, document_id)
    if not document:
        logger.error("Document %d not found for workflow evaluation", document_id)
        return 0

    # Query matching workflows
    stmt = (
        select(Workflow)
        .where(and_(
            Workflow.enabled == True,  # noqa: E712
            Workflow.user_id == document.user_id,
        ))
        .order_by(Workflow.order)
    )
    if workflow_id:
        stmt = stmt.where(Workflow.id == workflow_id)

    result = await db.execute(stmt)
    workflows = result.scalars().all()

    fired_count = 0

    for workflow in workflows:
        # Check each trigger of the matching type
        # First matching trigger wins for this workflow (Paperless matching.py L638-641)
        matched = False

        for trigger in workflow.triggers:
            if trigger.type != trigger_type:
                continue

            if await _trigger_matches(trigger, document, db, source=source, filename=filename):
                logger.info(
                    "Workflow '%s' (id=%d) triggered for document %d (type=%s)",
                    workflow.name, workflow.id, document_id,
                    WorkflowTriggerType(trigger_type).name,
                )
                matched = True
                break  # First matching trigger wins

        if not matched:
            continue

        # Execute ALL actions for this workflow
        for action in workflow.actions:
            try:
                await _execute_action(action, document, db)
            except Exception as e:
                logger.error(
                    "Action %d (type=%s) failed for workflow '%s': %s",
                    action.id, WorkflowActionType(action.type).name,
                    workflow.name, e, exc_info=True,
                )

        # Log execution
        run = WorkflowRun(
            workflow_id=workflow.id,
            document_id=document_id,
            trigger_type=trigger_type,
        )
        db.add(run)
        fired_count += 1

    if fired_count > 0:
        await db.commit()
        logger.info(
            "%d workflow(s) fired for document %d", fired_count, document_id,
        )

    return fired_count


# ---------------------------------------------------------------------------
# Trigger matching — 13-check chain
# ---------------------------------------------------------------------------

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

    13-check filter chain sourced from Paperless matching.py L400-505.
    Order matters — cheapest checks first.
    """
    # 1. Source filter (CONSUMPTION triggers only)
    if trigger.filter_sources and source:
        if source not in trigger.filter_sources:
            return False

    # 2. Filename glob (case insensitive)
    if trigger.filter_filename:
        fn = filename or getattr(document, "filename", "") or ""
        if not fnmatch.fnmatch(fn.lower(), trigger.filter_filename.lower()):
            return False

    # 3. Path prefix
    if trigger.filter_path:
        file_path = getattr(document, "file_path", "") or ""
        if not file_path.startswith(trigger.filter_path):
            return False

    # 4-6. Tag filters
    doc_tag_ids = set()
    if hasattr(document, "tags") and document.tags:
        doc_tag_ids = {t.id for t in document.tags}

    # 4. HAS ANY tag (OR match)
    if trigger.filter_has_tag_ids:
        if not set(trigger.filter_has_tag_ids) & doc_tag_ids:
            return False

    # 5. HAS ALL tags (AND match)
    if trigger.filter_has_all_tag_ids:
        if not set(trigger.filter_has_all_tag_ids).issubset(doc_tag_ids):
            return False

    # 6. HAS NOT tags (exclusion)
    if trigger.filter_has_not_tag_ids:
        if set(trigger.filter_has_not_tag_ids) & doc_tag_ids:
            return False

    # 7. Document type (positive match)
    if trigger.filter_has_document_type_id is not None:
        if document.document_type_id != trigger.filter_has_document_type_id:
            return False

    # 8. NOT document types (exclusion)
    if trigger.filter_has_not_document_type_ids:
        if document.document_type_id in trigger.filter_has_not_document_type_ids:
            return False

    # 9. Correspondent (positive match)
    if trigger.filter_has_correspondent_id is not None:
        if document.correspondent_id != trigger.filter_has_correspondent_id:
            return False

    # 10. NOT correspondents (exclusion)
    if trigger.filter_has_not_correspondent_ids:
        if document.correspondent_id in trigger.filter_has_not_correspondent_ids:
            return False

    # 11. Storage path (positive match)
    if trigger.filter_has_storage_path_id is not None:
        if document.storage_path_id != trigger.filter_has_storage_path_id:
            return False

    # 12. NOT storage paths (exclusion)
    if trigger.filter_has_not_storage_path_ids:
        if document.storage_path_id in trigger.filter_has_not_storage_path_ids:
            return False

    # 13. Content matching (reuses Phase 3 matching engine)
    if trigger.match and trigger.matching_algorithm and trigger.matching_algorithm > 0:
        try:
            from app.services.classification.matching import matches as content_matches
            content = getattr(document, "content_text", "") or ""
            if not content_matches(trigger, content):
                return False
        except ImportError:
            logger.warning("Classification matching engine not available")

    return True


# ---------------------------------------------------------------------------
# Action execution
# ---------------------------------------------------------------------------

async def _execute_action(
    action: WorkflowAction,
    document,
    db: AsyncSession,
) -> None:
    """
    Execute a single workflow action on a document.

    Sourced from Paperless handlers.py L780-1335.
    Simplified: no overrides path, no permissions, no custom fields.
    """
    if action.type == WorkflowActionType.ASSIGNMENT:
        await _assignment_action(action, document, db)
    elif action.type == WorkflowActionType.REMOVAL:
        _removal_action(action, document)
    elif action.type == WorkflowActionType.EMAIL:
        _email_action(action, document)
    elif action.type == WorkflowActionType.WEBHOOK:
        await _webhook_action(action, document)
    else:
        logger.warning("Unknown action type: %d", action.type)


async def _assignment_action(
    action: WorkflowAction, document, db: AsyncSession,
) -> None:
    """
    Set metadata on a document.
    Sourced from Paperless handlers.py L780-885.
    """
    # Assign tags
    if action.assign_tag_ids:
        from app.models.tag import Tag
        existing_ids = {t.id for t in document.tags} if document.tags else set()
        for tag_id in action.assign_tag_ids:
            if tag_id not in existing_ids:
                tag = await db.get(Tag, tag_id)
                if tag:
                    document.tags.append(tag)
                    logger.debug("Assigned tag %d to document %d", tag_id, document.id)

    # Assign correspondent
    if action.assign_correspondent_id is not None:
        document.correspondent_id = action.assign_correspondent_id

    # Assign document type
    if action.assign_document_type_id is not None:
        document.document_type_id = action.assign_document_type_id

    # Assign storage path
    if action.assign_storage_path_id is not None:
        document.storage_path_id = action.assign_storage_path_id

    # Assign owner (transfer ownership)
    if action.assign_owner_id is not None:
        document.user_id = action.assign_owner_id

    # Assign title
    if action.assign_title:
        document.filename = action.assign_title[:256]  # Limit per Paperless L1397


def _removal_action(action: WorkflowAction, document) -> None:
    """
    Remove/clear metadata from a document.
    Sourced from Paperless handlers.py L926-1095.
    """
    # Remove ALL tags
    if action.remove_all_tags:
        if hasattr(document, "tags"):
            document.tags.clear()
    elif action.remove_tag_ids:
        # Remove specific tags
        remove_set = set(action.remove_tag_ids)
        document.tags = [t for t in document.tags if t.id not in remove_set]

    # Clear correspondent
    if action.remove_correspondent:
        document.correspondent_id = None

    # Clear document type
    if action.remove_document_type:
        document.document_type_id = None

    # Clear storage path
    if action.remove_storage_path:
        document.storage_path_id = None


def _email_action(action: WorkflowAction, document) -> None:
    """
    Send email notification via existing Celery task.
    Uses app.services.background.tasks.send_email_task (already in task_routes).
    """
    if not action.email_to:
        logger.warning("Email action has no recipient, skipping")
        return

    try:
        from app.services.background.celery_app import celery_app

        subject = action.email_subject or f"Workflow: {document.filename}"
        body = action.email_body or f"Document '{document.filename}' matched a workflow."

        celery_app.send_task(
            "app.services.background.tasks.send_email_task",
            args=[action.email_to, subject, body],
            queue="emails",
        )
        logger.info("Queued email to %s for document %d", action.email_to, document.id)
    except Exception as e:
        logger.error("Failed to queue email action: %s", e, exc_info=True)


async def _webhook_action(action: WorkflowAction, document) -> None:
    """
    Send HTTP POST webhook callback.
    Sourced from Paperless handlers.py L1223-1335.
    """
    if not action.webhook_url:
        logger.warning("Webhook action has no URL, skipping")
        return

    try:
        import httpx

        payload = dict(action.webhook_body) if action.webhook_body else {}
        payload["document_id"] = document.id
        payload["document_filename"] = document.filename

        headers = dict(action.webhook_headers) if action.webhook_headers else {}

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                action.webhook_url,
                json=payload,
                headers=headers,
            )
            logger.info(
                "Webhook to %s: status=%d for document %d",
                action.webhook_url, response.status_code, document.id,
            )
    except Exception as e:
        logger.error(
            "Webhook to %s failed: %s", action.webhook_url, e, exc_info=True,
        )
