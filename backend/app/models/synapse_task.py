"""
SynapseTask model for Celery task lifecycle tracking.

Inspired by paperless-ngx's PaperlessTask pattern:
- Tracks task status (PENDING → STARTED → SUCCESS/FAILURE)
- Stores task metadata and results
- Enables UI display of background task progress
- Integrates with Celery signals for automatic updates
"""

from datetime import datetime
from typing import Optional
import enum

from sqlalchemy import String, Text, DateTime, Boolean, ForeignKey, func, Index
from sqlalchemy.orm import Mapped, mapped_column

from sqlalchemy import Enum as SQLEnum

from .base import Base


class TaskStatus(str, enum.Enum):
    """Celery task states matching celery.states."""

    PENDING = "PENDING"
    STARTED = "STARTED"
    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"
    RETRY = "RETRY"
    REVOKED = "REVOKED"


class TaskType(str, enum.Enum):
    """Type of task execution."""

    AUTO = "auto"  # Triggered automatically (e.g., document upload)
    SCHEDULED = "scheduled"  # Triggered by Celery Beat
    MANUAL = "manual"  # Triggered manually via API


class TaskName(str, enum.Enum):
    """Known task names for categorization."""

    PROCESS_DOCUMENT = "process_document"
    INGEST_RAG = "ingest_rag"
    BATCH_INGEST = "batch_ingest"
    SEND_EMAIL = "send_email"
    GENERATE_REPORT = "generate_report"
    CLEANUP = "cleanup"
    RETRY_WEBHOOKS = "retry_webhooks"
    REBUILD_INDEX = "rebuild_index"
    OTHER = "other"


class SynapseTask(Base):
    """
    Celery task tracking model.

    Records every tracked task's lifecycle:
    - Created when task is published to broker
    - Updated when task starts execution
    - Updated when task completes or fails

    Enables:
    - Task status display in UI
    - Task history and debugging
    - User-specific task tracking
    """

    __tablename__ = "synapse_tasks"

    # Primary Key
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, doc="Primary key")

    # Celery Task ID (unique identifier from Celery)
    task_id: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True, doc="Celery task UUID"
    )

    # Task identification
    task_name: Mapped[Optional[TaskName]] = mapped_column(
        SQLEnum(TaskName, native_enum=False), nullable=True, index=True, doc="Categorized task name"
    )

    celery_task_name: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, doc="Full Celery task name (e.g., 'rag.ingest_document')"
    )

    task_type: Mapped[TaskType] = mapped_column(
        SQLEnum(TaskType, native_enum=False),
        default=TaskType.AUTO,
        nullable=False,
        doc="How the task was triggered",
    )

    # Status tracking
    status: Mapped[TaskStatus] = mapped_column(
        SQLEnum(TaskStatus, native_enum=False),
        default=TaskStatus.PENDING,
        nullable=False,
        index=True,
        doc="Current task state",
    )

    # Owner (optional - for user-specific tasks)
    owner_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="User who triggered the task",
    )

    # Task metadata
    task_file_name: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, doc="Associated filename (for document tasks)"
    )

    task_args: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, doc="JSON-serialized task arguments (for debugging)"
    )

    # Timestamps
    date_created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
        doc="When task was published to broker",
    )

    date_started: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, doc="When worker started execution"
    )

    date_done: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
        doc="When task completed (success or failure)",
    )

    # Result
    result: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, doc="Task result or error traceback"
    )

    # UI acknowledgment
    acknowledged: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, doc="Whether user has seen/dismissed this task"
    )

    # Indexes for common queries
    __table_args__ = (
        Index("ix_synapse_tasks_status_created", "status", "date_created"),
        Index("ix_synapse_tasks_owner_status", "owner_id", "status"),
    )

    def __repr__(self) -> str:
        """String representation of SynapseTask."""
        return (
            f"<SynapseTask(id={self.id}, task_id='{self.task_id[:8]}...', "
            f"status={self.status.value}, task_name={self.task_name})>"
        )

    @property
    def is_complete(self) -> bool:
        """Check if task has finished (success or failure)."""
        return self.status in (TaskStatus.SUCCESS, TaskStatus.FAILURE, TaskStatus.REVOKED)

    @property
    def is_successful(self) -> bool:
        """Check if task completed successfully."""
        return self.status == TaskStatus.SUCCESS

    @property
    def duration_seconds(self) -> Optional[float]:
        """Calculate task execution duration in seconds."""
        if self.date_started and self.date_done:
            return (self.date_done - self.date_started).total_seconds()
        return None
