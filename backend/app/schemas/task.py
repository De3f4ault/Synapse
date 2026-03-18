"""
Task status schemas for API responses.

Sourced from Paperless-ngx API task serializer.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class TaskResponse(BaseModel):
    """Single task status."""

    id: int
    task_id: str
    task_name: Optional[str] = None
    celery_task_name: Optional[str] = None
    task_type: str
    status: str
    task_file_name: Optional[str] = None
    result: Optional[str] = None
    acknowledged: bool = False
    date_created: datetime
    date_started: Optional[datetime] = None
    date_done: Optional[datetime] = None
    duration_seconds: Optional[float] = None

    class Config:
        from_attributes = True


class TaskListResponse(BaseModel):
    """Paginated task list."""

    tasks: list[TaskResponse]
    total: int
