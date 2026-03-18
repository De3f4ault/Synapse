"""
Task status API — list user tasks, acknowledge (dismiss) tasks.

Sourced from Paperless-ngx api/views.py TaskViewSet.

GET  /api/tasks/                       — list tasks for current user
PATCH /api/tasks/{task_id}/acknowledge — dismiss a task notification
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.synapse_task import SynapseTask, TaskStatus
from app.models.user import User
from app.schemas.task import TaskResponse, TaskListResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=TaskListResponse)
async def list_tasks(
    status_filter: Optional[str] = Query(None, alias="status"),
    acknowledged: Optional[bool] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List tasks for the current user.

    Filters:
      - status: PENDING, STARTED, SUCCESS, FAILURE, RETRY, REVOKED
      - acknowledged: true/false
    """
    query = select(SynapseTask).where(SynapseTask.owner_id == current_user.id)

    if status_filter:
        try:
            ts = TaskStatus(status_filter.upper())
            query = query.where(SynapseTask.status == ts)
        except ValueError:
            pass  # Ignore invalid status filter

    if acknowledged is not None:
        query = query.where(SynapseTask.acknowledged == acknowledged)

    # Count
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Fetch
    query = query.order_by(desc(SynapseTask.date_created)).offset(offset).limit(limit)
    result = await db.execute(query)
    tasks = result.scalars().all()

    return TaskListResponse(
        tasks=[
            TaskResponse(
                id=t.id,
                task_id=t.task_id,
                task_name=t.task_name.value if t.task_name else None,
                celery_task_name=t.celery_task_name,
                task_type=t.task_type.value if t.task_type else "auto",
                status=t.status.value if t.status else "PENDING",
                task_file_name=t.task_file_name,
                result=t.result,
                acknowledged=t.acknowledged,
                date_created=t.date_created,
                date_started=t.date_started,
                date_done=t.date_done,
                duration_seconds=t.duration_seconds,
            )
            for t in tasks
        ],
        total=total,
    )


@router.patch("/{task_id}/acknowledge", status_code=status.HTTP_204_NO_CONTENT)
async def acknowledge_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Acknowledge (dismiss) a task notification.

    Sourced from Paperless TaskViewSet.acknowledge().
    """
    result = await db.execute(
        select(SynapseTask).where(
            SynapseTask.task_id == task_id,
            SynapseTask.owner_id == current_user.id,
        )
    )
    task = result.scalars().first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task {task_id} not found",
        )

    task.acknowledged = True
    await db.commit()
