"""
Progress manager for real-time task status updates.

Provides a context manager that tracks task progress and updates
the SynapseTask record. WebSocket/SSE wiring deferred — logs for now.

Sourced from Paperless-ngx plugins/base.py ProgressManager.
"""

import enum
import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)


class ProgressStatus(str, enum.Enum):
    """
    Task progress states.

    Sourced from Paperless plugins/base.py ProgressStatusOptions.
    """

    STARTED = "STARTED"
    WORKING = "WORKING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"


class ProgressManager:
    """
    Real-time task progress tracker.

    Usage:
        with ProgressManager("invoice.pdf", task_id) as pm:
            pm.send_progress(ProgressStatus.WORKING, "Parsing...", 1, 4)
            pm.send_progress(ProgressStatus.WORKING, "OCR...", 2, 4)
            pm.send_progress(ProgressStatus.WORKING, "Storing...", 3, 4)
        # Automatically sends SUCCESS on clean exit, FAILED on exception

    Updates the SynapseTask record and logs progress.
    WebSocket/SSE push deferred to frontend integration phase.
    """

    def __init__(self, filename: str, task_id: str):
        self.filename = filename
        self.task_id = task_id
        self._synapse_task_id: Optional[int] = None

    def __enter__(self):
        self.send_progress(ProgressStatus.STARTED, "Processing started", 0, 100)
        self._update_task_status("STARTED", started=True)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.send_progress(ProgressStatus.FAILED, str(exc_val), 100, 100)
            self._update_task_status("FAILURE", result=str(exc_val), done=True)
        else:
            self.send_progress(ProgressStatus.SUCCESS, "Processing complete", 100, 100)
            self._update_task_status("SUCCESS", done=True)
        return False  # Don't suppress exceptions

    def send_progress(
        self,
        status: ProgressStatus,
        message: str,
        current: int,
        total: int,
    ) -> None:
        """
        Send progress update.

        Logs progress. WebSocket/SSE push will be wired in Phase 4.
        """
        logger.info(
            "[%s] %s: %s (%d/%d) — %s",
            self.task_id[:8] if self.task_id else "?",
            self.filename,
            status.value,
            current,
            total,
            message,
        )
        # TODO: Wire to WebSocket/SSE channel for real-time frontend updates
        # Example:
        # await event_bus.publish("task_progress", {
        #     "task_id": self.task_id,
        #     "filename": self.filename,
        #     "status": status.value,
        #     "message": message,
        #     "progress": current,
        #     "total": total,
        # })

    def _update_task_status(
        self,
        status: str,
        result: Optional[str] = None,
        started: bool = False,
        done: bool = False,
    ) -> None:
        """Update the SynapseTask record in the DB (sync, best-effort)."""
        try:
            from app.db.session import get_sync_session
            from app.models.synapse_task import SynapseTask

            with get_sync_session() as db:
                task = db.query(SynapseTask).filter(
                    SynapseTask.task_id == self.task_id
                ).first()

                if task:
                    task.status = status
                    if started:
                        task.date_started = datetime.now(timezone.utc)
                    if done:
                        task.date_done = datetime.now(timezone.utc)
                    if result:
                        task.result = result
                    db.commit()
                    self._synapse_task_id = task.id
        except Exception as e:
            # Best-effort — don't break the pipeline over task tracking
            logger.debug("Failed to update SynapseTask: %s", e)
