"""
Workflow CRUD API — 7 endpoints.

Follows existing Synapse API patterns (correspondents, document_types, etc.)
with ownership filtering and nested trigger/action management.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.workflow import (
    Workflow, WorkflowTrigger, WorkflowAction, WorkflowRun,
    WorkflowTriggerType,
    workflow_triggers_assoc, workflow_actions_assoc,
)
from app.schemas.workflows import (
    WorkflowCreate, WorkflowUpdate,
    WorkflowResponse, WorkflowListResponse,
    WorkflowRunResponse,
    WorkflowTriggerCreate, WorkflowActionCreate,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_workflow_or_404(
    workflow_id: int, user: User, db: AsyncSession,
) -> Workflow:
    """Get a workflow owned by the user or raise 404."""
    workflow = await db.get(Workflow, workflow_id)
    if not workflow or workflow.user_id != user.id:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow


def _trigger_from_schema(
    schema: WorkflowTriggerCreate, user_id: int,
) -> WorkflowTrigger:
    """Create a WorkflowTrigger ORM instance from a Pydantic schema."""
    return WorkflowTrigger(
        type=schema.type,
        filter_sources=schema.filter_sources,
        filter_filename=schema.filter_filename,
        filter_path=schema.filter_path,
        match=schema.match,
        matching_algorithm=schema.matching_algorithm,
        is_insensitive=schema.is_insensitive,
        filter_has_tag_ids=schema.filter_has_tag_ids,
        filter_has_all_tag_ids=schema.filter_has_all_tag_ids,
        filter_has_not_tag_ids=schema.filter_has_not_tag_ids,
        filter_has_document_type_id=schema.filter_has_document_type_id,
        filter_has_not_document_type_ids=schema.filter_has_not_document_type_ids,
        filter_has_correspondent_id=schema.filter_has_correspondent_id,
        filter_has_not_correspondent_ids=schema.filter_has_not_correspondent_ids,
        filter_has_storage_path_id=schema.filter_has_storage_path_id,
        filter_has_not_storage_path_ids=schema.filter_has_not_storage_path_ids,
        schedule_date_field=schema.schedule_date_field,
        schedule_offset_days=schema.schedule_offset_days,
        schedule_is_recurring=schema.schedule_is_recurring,
        schedule_recurring_interval_days=schema.schedule_recurring_interval_days,
        user_id=user_id,
    )


def _action_from_schema(
    schema: WorkflowActionCreate, user_id: int,
) -> WorkflowAction:
    """Create a WorkflowAction ORM instance from a Pydantic schema."""
    return WorkflowAction(
        type=schema.type,
        assign_title=schema.assign_title,
        assign_tag_ids=schema.assign_tag_ids,
        assign_correspondent_id=schema.assign_correspondent_id,
        assign_document_type_id=schema.assign_document_type_id,
        assign_storage_path_id=schema.assign_storage_path_id,
        assign_owner_id=schema.assign_owner_id,
        remove_tag_ids=schema.remove_tag_ids,
        remove_all_tags=schema.remove_all_tags,
        remove_correspondent=schema.remove_correspondent,
        remove_document_type=schema.remove_document_type,
        remove_storage_path=schema.remove_storage_path,
        email_subject=schema.email_subject,
        email_body=schema.email_body,
        email_to=schema.email_to,
        webhook_url=schema.webhook_url,
        webhook_headers=schema.webhook_headers,
        webhook_body=schema.webhook_body,
        user_id=user_id,
    )


def _workflow_response(workflow: Workflow, run_count: int = 0) -> dict:
    """Build a WorkflowResponse dict from an ORM instance."""
    return {
        "id": workflow.id,
        "name": workflow.name,
        "order": workflow.order,
        "enabled": workflow.enabled,
        "triggers": [
            {
                "id": t.id,
                "type": t.type,
                "filter_sources": t.filter_sources,
                "filter_filename": t.filter_filename,
                "filter_path": t.filter_path,
                "match": t.match,
                "matching_algorithm": t.matching_algorithm,
                "is_insensitive": t.is_insensitive,
                "filter_has_tag_ids": t.filter_has_tag_ids,
                "filter_has_all_tag_ids": t.filter_has_all_tag_ids,
                "filter_has_not_tag_ids": t.filter_has_not_tag_ids,
                "filter_has_document_type_id": t.filter_has_document_type_id,
                "filter_has_not_document_type_ids": t.filter_has_not_document_type_ids,
                "filter_has_correspondent_id": t.filter_has_correspondent_id,
                "filter_has_not_correspondent_ids": t.filter_has_not_correspondent_ids,
                "filter_has_storage_path_id": t.filter_has_storage_path_id,
                "filter_has_not_storage_path_ids": t.filter_has_not_storage_path_ids,
                "schedule_date_field": t.schedule_date_field,
                "schedule_offset_days": t.schedule_offset_days,
                "schedule_is_recurring": t.schedule_is_recurring,
                "schedule_recurring_interval_days": t.schedule_recurring_interval_days,
                "created_at": t.created_at,
                "updated_at": t.updated_at,
            }
            for t in workflow.triggers
        ],
        "actions": [
            {
                "id": a.id,
                "type": a.type,
                "assign_title": a.assign_title,
                "assign_tag_ids": a.assign_tag_ids,
                "assign_correspondent_id": a.assign_correspondent_id,
                "assign_document_type_id": a.assign_document_type_id,
                "assign_storage_path_id": a.assign_storage_path_id,
                "assign_owner_id": a.assign_owner_id,
                "remove_tag_ids": a.remove_tag_ids,
                "remove_all_tags": a.remove_all_tags,
                "remove_correspondent": a.remove_correspondent,
                "remove_document_type": a.remove_document_type,
                "remove_storage_path": a.remove_storage_path,
                "email_subject": a.email_subject,
                "email_body": a.email_body,
                "email_to": a.email_to,
                "webhook_url": a.webhook_url,
                "webhook_headers": a.webhook_headers,
                "webhook_body": a.webhook_body,
                "created_at": a.created_at,
                "updated_at": a.updated_at,
            }
            for a in workflow.actions
        ],
        "run_count": run_count,
        "created_at": workflow.created_at,
        "updated_at": workflow.updated_at,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/", response_model=list[WorkflowListResponse])
async def list_workflows(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all workflows for the current user."""
    stmt = (
        select(Workflow)
        .where(Workflow.user_id == current_user.id)
        .order_by(Workflow.order, Workflow.name)
    )
    result = await db.execute(stmt)
    workflows = result.scalars().all()

    items = []
    for wf in workflows:
        # Count runs
        run_count_result = await db.execute(
            select(func.count(WorkflowRun.id)).where(
                WorkflowRun.workflow_id == wf.id,
            )
        )
        run_count = run_count_result.scalar() or 0

        items.append({
            "id": wf.id,
            "name": wf.name,
            "order": wf.order,
            "enabled": wf.enabled,
            "trigger_count": len(wf.triggers),
            "action_count": len(wf.actions),
            "run_count": run_count,
            "created_at": wf.created_at,
        })

    return items


@router.post("/", response_model=WorkflowResponse, status_code=201)
async def create_workflow(
    data: WorkflowCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a workflow with nested triggers and actions.
    All entities are created in a single transaction.
    """
    from sqlalchemy.exc import IntegrityError

    # Create triggers
    triggers = []
    for ts in data.triggers:
        trigger = _trigger_from_schema(ts, current_user.id)
        db.add(trigger)
        triggers.append(trigger)

    # Create actions
    actions = []
    for as_ in data.actions:
        action = _action_from_schema(as_, current_user.id)
        db.add(action)
        actions.append(action)

    # Flush to get IDs for M2M
    await db.flush()

    # Create workflow
    workflow = Workflow(
        name=data.name,
        order=data.order,
        enabled=data.enabled,
        user_id=current_user.id,
    )
    workflow.triggers = triggers
    workflow.actions = actions
    db.add(workflow)

    try:
        await db.commit()
        await db.refresh(workflow)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"Workflow with name '{data.name}' already exists",
        )

    return _workflow_response(workflow, run_count=0)


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific workflow with triggers, actions, and run count."""
    workflow = await _get_workflow_or_404(workflow_id, current_user, db)

    run_count_result = await db.execute(
        select(func.count(WorkflowRun.id)).where(
            WorkflowRun.workflow_id == workflow.id,
        )
    )
    run_count = run_count_result.scalar() or 0

    return _workflow_response(workflow, run_count=run_count)


@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: int,
    data: WorkflowUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a workflow. Triggers and actions are replaced entirely
    if provided (delete old M2M links + old entities, create new).
    """
    workflow = await _get_workflow_or_404(workflow_id, current_user, db)

    # Update scalar fields
    if data.name is not None:
        workflow.name = data.name
    if data.order is not None:
        workflow.order = data.order
    if data.enabled is not None:
        workflow.enabled = data.enabled

    # Replace triggers if provided
    if data.triggers is not None:
        # Clear M2M
        await db.execute(
            delete(workflow_triggers_assoc).where(
                workflow_triggers_assoc.c.workflow_id == workflow.id,
            )
        )
        # Delete orphaned trigger entities
        old_trigger_ids = [t.id for t in workflow.triggers]
        if old_trigger_ids:
            await db.execute(
                delete(WorkflowTrigger).where(
                    WorkflowTrigger.id.in_(old_trigger_ids),
                )
            )

        # Create new triggers
        new_triggers = []
        for ts in data.triggers:
            trigger = _trigger_from_schema(ts, current_user.id)
            db.add(trigger)
            new_triggers.append(trigger)
        await db.flush()
        workflow.triggers = new_triggers

    # Replace actions if provided
    if data.actions is not None:
        await db.execute(
            delete(workflow_actions_assoc).where(
                workflow_actions_assoc.c.workflow_id == workflow.id,
            )
        )
        old_action_ids = [a.id for a in workflow.actions]
        if old_action_ids:
            await db.execute(
                delete(WorkflowAction).where(
                    WorkflowAction.id.in_(old_action_ids),
                )
            )

        new_actions = []
        for as_ in data.actions:
            action = _action_from_schema(as_, current_user.id)
            db.add(action)
            new_actions.append(action)
        await db.flush()
        workflow.actions = new_actions

    from sqlalchemy.exc import IntegrityError
    try:
        await db.commit()
        await db.refresh(workflow)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Name conflict")

    run_count_result = await db.execute(
        select(func.count(WorkflowRun.id)).where(
            WorkflowRun.workflow_id == workflow.id,
        )
    )
    run_count = run_count_result.scalar() or 0

    return _workflow_response(workflow, run_count=run_count)


@router.delete("/{workflow_id}", status_code=204)
async def delete_workflow(
    workflow_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a workflow and cascade to M2M links + runs."""
    workflow = await _get_workflow_or_404(workflow_id, current_user, db)

    # Clean up orphaned triggers and actions
    trigger_ids = [t.id for t in workflow.triggers]
    action_ids = [a.id for a in workflow.actions]

    await db.delete(workflow)
    await db.flush()

    # Delete orphaned triggers/actions not linked to any other workflow
    if trigger_ids:
        for tid in trigger_ids:
            remaining = await db.execute(
                select(func.count()).select_from(workflow_triggers_assoc).where(
                    workflow_triggers_assoc.c.trigger_id == tid,
                )
            )
            if (remaining.scalar() or 0) == 0:
                trigger = await db.get(WorkflowTrigger, tid)
                if trigger:
                    await db.delete(trigger)

    if action_ids:
        for aid in action_ids:
            remaining = await db.execute(
                select(func.count()).select_from(workflow_actions_assoc).where(
                    workflow_actions_assoc.c.action_id == aid,
                )
            )
            if (remaining.scalar() or 0) == 0:
                action = await db.get(WorkflowAction, aid)
                if action:
                    await db.delete(action)

    await db.commit()


@router.get("/{workflow_id}/runs", response_model=list[WorkflowRunResponse])
async def list_workflow_runs(
    workflow_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List execution history for a workflow, newest first."""
    workflow = await _get_workflow_or_404(workflow_id, current_user, db)

    stmt = (
        select(WorkflowRun)
        .where(WorkflowRun.workflow_id == workflow.id)
        .order_by(WorkflowRun.run_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(stmt)
    runs = result.scalars().all()

    return [
        {
            "id": r.id,
            "workflow_id": r.workflow_id,
            "document_id": r.document_id,
            "trigger_type": r.trigger_type,
            "run_at": r.run_at,
        }
        for r in runs
    ]


@router.post("/{workflow_id}/test", response_model=dict)
async def test_workflow(
    workflow_id: int,
    document_id: int = Query(..., description="Document to test against"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Dry-run test: check if a document matches the workflow's triggers
    without executing any actions. Returns match results per trigger.
    """
    from app.services.workflows.engine import _trigger_matches
    from app.models.document import Document

    workflow = await _get_workflow_or_404(workflow_id, current_user, db)
    document = await db.get(Document, document_id)
    if not document or document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found")

    results = []
    for trigger in workflow.triggers:
        matched = await _trigger_matches(trigger, document, db)
        results.append({
            "trigger_id": trigger.id,
            "trigger_type": trigger.type,
            "matched": matched,
        })

    return {
        "workflow_id": workflow.id,
        "document_id": document_id,
        "triggers_tested": len(results),
        "any_matched": any(r["matched"] for r in results),
        "trigger_results": results,
    }
