"""
Celery signal handlers for task lifecycle tracking.

Based on paperless-ngx pattern:
- before_task_publish: Create SynapseTask in PENDING state
- task_prerun: Update to STARTED when worker begins
- task_postrun: Update with result and SUCCESS/FAILURE state
- task_failure: Handle failures with traceback

IMPORTANT: Uses synchronous database session because Celery
signals are synchronous callbacks, not async coroutines.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Optional

from celery.signals import (
    before_task_publish,
    task_prerun,
    task_postrun,
    task_failure,
)

from app.db.session import SessionLocal
from app.models.synapse_task import SynapseTask, TaskStatus, TaskType, TaskName

logger = logging.getLogger(__name__)

# Tasks to track (add more as needed)
TRACKED_TASKS = {
    "rag.ingest_document": TaskName.INGEST_RAG,
    "rag.batch_ingest": TaskName.BATCH_INGEST,
    "rag.rebuild_index": TaskName.REBUILD_INDEX,
    "app.services.background.tasks.process_document_task": TaskName.PROCESS_DOCUMENT,
    "app.services.background.tasks.send_email_task": TaskName.SEND_EMAIL,
    "app.services.background.tasks.generate_report_task": TaskName.GENERATE_REPORT,
    "app.services.background.tasks.cleanup_task": TaskName.CLEANUP,
    "tasks.retry_failed_webhooks": TaskName.RETRY_WEBHOOKS,
}


def _get_task_name(celery_task_name: str) -> TaskName:
    """Map Celery task name to TaskName enum."""
    return TRACKED_TASKS.get(celery_task_name, TaskName.OTHER)


def _extract_user_id(body: tuple) -> Optional[int]:
    """Extract user_id from task arguments if present."""
    try:
        args, kwargs, _ = body
        # Check kwargs first
        if kwargs and "user_id" in kwargs:
            return kwargs["user_id"]
        # Check first positional arg
        if args and isinstance(args[0], int):
            return args[0]
    except Exception:
        pass
    return None


def _extract_file_info(body: tuple) -> Optional[str]:
    """Extract filename from task arguments if present."""
    try:
        args, kwargs, _ = body
        for key in ["document_title", "filename", "file_name", "task_file_name"]:
            if kwargs and key in kwargs:
                return str(kwargs[key])[:255]
        # Check document_id as fallback
        if kwargs and "document_id" in kwargs:
            return f"doc:{kwargs['document_id']}"
    except Exception:
        pass
    return None


@before_task_publish.connect
def before_task_publish_handler(sender=None, headers=None, body=None, **kwargs):
    """
    Create SynapseTask in PENDING state before task reaches broker.

    This runs on the client side (API server), not the worker.
    """
    task_name = headers.get("task", "") if headers else ""

    # Only track specific tasks
    if task_name not in TRACKED_TASKS:
        return

    try:
        with SessionLocal() as session:
            task = SynapseTask(
                task_id=headers["id"],
                celery_task_name=task_name,
                task_name=_get_task_name(task_name),
                task_type=TaskType.AUTO,
                status=TaskStatus.PENDING,
                owner_id=_extract_user_id(body) if body else None,
                task_file_name=_extract_file_info(body) if body else None,
                task_args=json.dumps({"args": body[0], "kwargs": body[1]})[:2000] if body else None,
                date_created=datetime.now(timezone.utc),
            )
            session.add(task)
            session.commit()

            logger.debug(f"Created SynapseTask for {task_name}", extra={"task_id": headers["id"]})
    except Exception as e:
        # Don't let signal failure prevent task execution
        logger.error(f"Failed to create SynapseTask: {e}", exc_info=True)


@task_prerun.connect
def task_prerun_handler(sender=None, task_id=None, task=None, **kwargs):
    """
    Update task to STARTED when worker begins execution.

    This runs on the worker side.
    """
    try:
        with SessionLocal() as session:
            synapse_task = session.query(SynapseTask).filter(SynapseTask.task_id == task_id).first()

            if synapse_task:
                synapse_task.status = TaskStatus.STARTED
                synapse_task.date_started = datetime.now(timezone.utc)
                session.commit()

                logger.debug(f"SynapseTask {task_id} started", extra={"task_id": task_id})
    except Exception as e:
        logger.error(f"Failed to update SynapseTask prerun: {e}", exc_info=True)


@task_postrun.connect
def task_postrun_handler(sender=None, task_id=None, task=None, retval=None, state=None, **kwargs):
    """
    Update task with final result and status.

    This runs on the worker side after task completes.
    """
    try:
        with SessionLocal() as session:
            synapse_task = session.query(SynapseTask).filter(SynapseTask.task_id == task_id).first()

            if synapse_task:
                # Map Celery state to our enum
                if state == "SUCCESS":
                    synapse_task.status = TaskStatus.SUCCESS
                elif state == "FAILURE":
                    synapse_task.status = TaskStatus.FAILURE
                elif state == "REVOKED":
                    synapse_task.status = TaskStatus.REVOKED
                else:
                    synapse_task.status = TaskStatus.SUCCESS  # Default for completed

                synapse_task.date_done = datetime.now(timezone.utc)

                # Store result (truncate if too long)
                if retval is not None:
                    try:
                        result_str = json.dumps(retval)
                        synapse_task.result = result_str[:10000]
                    except (TypeError, ValueError):
                        synapse_task.result = str(retval)[:10000]

                session.commit()

                logger.debug(
                    f"SynapseTask {task_id} completed with state {state}",
                    extra={"task_id": task_id, "state": state},
                )
    except Exception as e:
        logger.error(f"Failed to update SynapseTask postrun: {e}", exc_info=True)


@task_failure.connect
def task_failure_handler(sender=None, task_id=None, exception=None, traceback=None, **kwargs):
    """
    Handle task failure with traceback storage.

    This provides more detailed error info than postrun for failures.
    """
    try:
        with SessionLocal() as session:
            synapse_task = session.query(SynapseTask).filter(SynapseTask.task_id == task_id).first()

            if synapse_task and synapse_task.result is None:
                synapse_task.status = TaskStatus.FAILURE
                synapse_task.date_done = datetime.now(timezone.utc)

                # Store full traceback
                error_info = f"Exception: {exception}\n\nTraceback:\n{traceback}"
                synapse_task.result = error_info[:10000]

                session.commit()

                logger.debug(
                    f"SynapseTask {task_id} failed",
                    extra={"task_id": task_id, "exception": str(exception)},
                )
    except Exception as e:
        logger.error(f"Failed to update SynapseTask failure: {e}", exc_info=True)
