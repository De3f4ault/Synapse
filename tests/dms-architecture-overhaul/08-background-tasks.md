# 08 — Background Task Infrastructure

> **Goal**: Define the complete Celery task landscape sourced from Paperless's battle-tested task infrastructure.

---

## Source of Truth: Paperless Implementation

### Key Paperless Files

| File | Lines | What We're Sourcing |
|---|---|---|
| [tasks.py](file:///home/de3f4ault/Desktop/Projects/synapse/tests/paperless-ngx/src/documents/tasks.py) | 566 | `consume_file()`, `train_classifier()`, `sanity_check()`, `empty_trash()`, `check_scheduled_workflows()`, `index_optimize()`, `index_reindex()`, `bulk_update_documents()` |
| [models.py](file:///home/de3f4ault/Desktop/Projects/synapse/tests/paperless-ngx/src/documents/models.py) L870-980 | 110 | `PaperlessTask` model — task status tracking for UI |
| [plugins/base.py](file:///home/de3f4ault/Desktop/Projects/synapse/tests/paperless-ngx/src/documents/plugins/base.py) | ~200 | `ProgressManager`, `ProgressStatusOptions` — real-time task progress |
| [celery.py](file:///home/de3f4ault/Desktop/Projects/synapse/tests/paperless-ngx/src/paperless/celery.py) | ~100 | Celery configuration + beat schedule |

### Paperless Task Architecture

From [tasks.py:138-204](file:///home/de3f4ault/Desktop/Projects/synapse/tests/paperless-ngx/src/documents/tasks.py#L138-L204) — the core `consume_file()` task:

```python
@shared_task(bind=True)
def consume_file(self: Task, input_doc: ConsumableDocument, overrides=None):
    if overrides is None:
        overrides = DocumentMetadataOverrides()

    plugins = [
        ConsumerPreflightPlugin,   # Validation + dedup
        CollatePlugin,             # Double-sided scanning
        BarcodePlugin,             # Barcode detection + splitting
        WorkflowTriggerPlugin,     # Pre-consumption workflow triggers
        ConsumerPlugin,            # Core: parse → OCR → store → index
    ]

    with ProgressManager(overrides.filename, self.request.id) as status_mgr, \
         TemporaryDirectory(dir=settings.SCRATCH_DIR) as tmp_dir:

        for plugin_class in plugins:
            plugin = plugin_class(input_doc, overrides, status_mgr, tmp_dir, self.request.id)

            if not plugin.able_to_run:
                continue

            try:
                plugin.setup()
                msg = plugin.run()
                overrides = plugin.metadata
            except StopConsumeTaskError as e:
                return e.message
            except Exception as e:
                status_mgr.send_progress(ProgressStatusOptions.FAILED, str(e), 100, 100)
                raise
            finally:
                plugin.cleanup()

    return msg
```

From [tasks.py:80-135](file:///home/de3f4ault/Desktop/Projects/synapse/tests/paperless-ngx/src/documents/tasks.py#L80-L135) — `train_classifier()` with skip logic:

```python
@shared_task
def train_classifier(*, scheduled=True):
    task = PaperlessTask.objects.create(
        type=PaperlessTask.TaskType.SCHEDULED_TASK if scheduled else MANUAL_TASK,
        task_id=uuid.uuid4(),
        task_name=PaperlessTask.TaskName.TRAIN_CLASSIFIER,
        status=states.STARTED,
    )
    # Skip if no AUTO matching items exist
    if (
        not Tag.objects.filter(matching_algorithm=Tag.MATCH_AUTO).exists()
        and not DocumentType.objects.filter(matching_algorithm=Tag.MATCH_AUTO).exists()
        and not Correspondent.objects.filter(matching_algorithm=Tag.MATCH_AUTO).exists()
        and not StoragePath.objects.filter(matching_algorithm=Tag.MATCH_AUTO).exists()
    ):
        # Clean up stale model file
        if settings.MODEL_FILE.exists():
            settings.MODEL_FILE.unlink()
        task.status = states.SUCCESS
        task.result = "No automatic matching items"
        task.save()
        return

    classifier = load_classifier()
    if not classifier:
        classifier = DocumentClassifier()

    try:
        if classifier.train():
            classifier.save()
        task.status = states.SUCCESS
    except Exception as e:
        task.status = states.FAILURE
        task.result = str(e)
    task.save()
```

From [tasks.py:354-388](file:///home/de3f4ault/Desktop/Projects/synapse/tests/paperless-ngx/src/documents/tasks.py#L354-L388) — `empty_trash()`:

```python
@shared_task
def empty_trash(doc_ids=None):
    documents = (
        Document.deleted_objects.filter(id__in=doc_ids) if doc_ids
        else Document.deleted_objects.filter(
            deleted_at__lt=timezone.now() - timedelta(days=settings.EMPTY_TRASH_DELAY)
        )
    )
    deleted_ids = list(documents.values_list("id", flat=True))
    # Connect cleanup handler temporarily
    models.signals.post_delete.connect(cleanup_document_deletion, sender=Document)
    documents.delete()  # Hard delete
    models.signals.post_delete.disconnect(cleanup_document_deletion, sender=Document)
    # Delete audit log entries for deleted documents
    if settings.AUDIT_LOG_ENABLED:
        LogEntry.objects.filter(object_id__in=deleted_ids).delete()
```

### Paperless PaperlessTask Model

From `models.py`:

```python
class PaperlessTask(models.Model):
    class TaskType(models.IntegerChoices):
        CONSUME_FILE = 1
        UPDATE_DOCUMENT = 2
        SCHEDULED_TASK = 3
        MANUAL_TASK = 4

    class TaskName(models.TextChoices):
        CONSUME_FILE = "consume_file"
        BULK_UPDATE = "bulk_update_documents"
        EMPTY_TRASH = "empty_trash"
        TRAIN_CLASSIFIER = "train_classifier"
        SANITY_CHECK = "sanity_check"

    task_id = UUIDField(unique=True)
    task_name = CharField(max_length=128, choices=TaskName.choices)
    task_file_name = CharField(max_length=256, blank=True, null=True)
    type = PositiveIntegerField(choices=TaskType.choices)
    status = CharField(max_length=30, default=states.PENDING)
    result = TextField(blank=True, null=True)
    acknowledged = BooleanField(default=False)
    related_document = CharField(max_length=256, blank=True, null=True)
    date_created = DateTimeField(auto_now_add=True)
    date_started = DateTimeField(blank=True, null=True)
    date_done = DateTimeField(blank=True, null=True)
```

### Paperless Progress Manager

From `plugins/base.py`:

```python
class ProgressStatusOptions(str, Enum):
    STARTED = "STARTED"
    WORKING = "WORKING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"

class ProgressManager:
    def __init__(self, filename, task_id):
        self.filename = filename
        self.task_id = task_id

    def send_progress(self, status, message, current_progress, max_progress):
        """Send WebSocket event to frontend for real-time progress."""
        data = {
            "type": "status_update",
            "data": {
                "filename": self.filename,
                "task_id": self.task_id,
                "current_progress": current_progress,
                "max_progress": max_progress,
                "status": status,
                "message": message,
            }
        }
        async_to_sync(channel_layer.group_send)("status_updates", data)
```

---

## Synapse Files Being Modified

| File | Current State | Change |
|---|---|---|
| [celery_app.py](file:///home/de3f4ault/Desktop/Projects/synapse/backend/app/core/celery_app.py) (~50 lines) | Basic Celery config, `process_document` task only | **Extend**: Add beat schedule, multiple queues, task registration |
| [document_processor.py](file:///home/de3f4ault/Desktop/Projects/synapse/backend/app/services/document/document_processor.py) (388 lines) | `process_document()` Celery task — monolithic | **Replace**: With `consume_document` plugin pipeline task |
| **New file**: `models/task.py` | Does not exist | **Create**: `SynapseTask` status tracking model |
| **New file**: `services/background/tasks.py` | Does not exist | **Create**: All Celery task definitions |
| **New file**: `services/background/progress.py` | Does not exist | **Create**: `ProgressManager` with WebSocket events |

---

## Synapse Implementation

### Task Status Model

```python
# backend/app/models/task.py

import enum
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Text, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base


class TaskType(int, enum.Enum):
    CONSUME_FILE = 1
    UPDATE_DOCUMENT = 2
    SCHEDULED_TASK = 3
    MANUAL_TASK = 4


class TaskStatus(str, enum.Enum):
    PENDING = "PENDING"
    STARTED = "STARTED"
    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"


class SynapseTask(Base):
    """
    Task status tracking for UI display.

    Sourced from Paperless PaperlessTask model.
    Stores task metadata so the frontend can show
    progress, results, and history.
    """
    __tablename__ = "synapse_tasks"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    task_id: Mapped[str] = mapped_column(
        String(64), unique=True, index=True,
        default=lambda: str(uuid.uuid4())
    )
    task_name: Mapped[str] = mapped_column(String(128), nullable=False)
    task_file_name: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    type: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="PENDING")
    result: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    related_document_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    date_created: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    date_started: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    date_done: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
```

### Progress Manager

```python
# backend/app/services/background/progress.py

import enum
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class ProgressStatus(str, enum.Enum):
    """
    Sourced from Paperless plugins/base.py ProgressStatusOptions.
    """
    STARTED = "STARTED"
    WORKING = "WORKING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"


class ProgressManager:
    """
    Sends real-time progress updates to the frontend.

    Sourced from Paperless plugins/base.py ProgressManager.
    In Paperless, this uses Django Channels (WebSocket).
    In Synapse, we use either WebSocket or SSE via FastAPI.
    """

    def __init__(self, filename: str, task_id: str):
        self.filename = filename
        self.task_id = task_id

    def __enter__(self):
        self.send_progress(ProgressStatus.STARTED, "Processing started", 0, 100)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.send_progress(ProgressStatus.FAILED, str(exc_val), 100, 100)
        return False

    def send_progress(
        self,
        status: ProgressStatus,
        message: str,
        current: int,
        total: int,
    ):
        """
        Send progress update.
        For now, log it. Wire to WebSocket/SSE in frontend implementation.
        """
        logger.info(
            f"[{self.task_id}] {self.filename}: {status.value} "
            f"({current}/{total}) — {message}"
        )
        # TODO: Wire to WebSocket/SSE channel
        # Example: await channel.send_json({
        #     "type": "task_progress",
        #     "task_id": self.task_id,
        #     "filename": self.filename,
        #     "status": status.value,
        #     "message": message,
        #     "progress": current,
        #     "total": total,
        # })
```

### Task Definitions

```python
# backend/app/services/background/tasks.py

import uuid
import logging
from datetime import datetime
from celery import shared_task, Task
from pathlib import Path
from tempfile import TemporaryDirectory

logger = logging.getLogger(__name__)


# =============================================================================
# ON-DEMAND TASKS
# =============================================================================

@shared_task(
    bind=True,
    acks_late=True,
    reject_on_worker_lost=True,
    time_limit=1800,       # 30 minute hard limit
    soft_time_limit=1500,  # 25 minute soft limit
    queue="ingestion",
)
def consume_document(self: Task, consumable_data: dict):
    """
    Ingest a new document through the plugin pipeline.

    Sourced from Paperless tasks.py:138-204 consume_file().

    Key reliability patterns from Paperless:
    - bind=True: access to self.request for task ID
    - acks_late: message only acked after SUCCESS (survives worker crash)
    - reject_on_worker_lost: requeue if worker dies mid-task
    - TemporaryDirectory: scratch space auto-cleaned
    """
    from app.services.background.progress import ProgressManager
    from app.services.ingestion.pipeline import PipelineRunner
    from app.config.storage import storage_config

    filename = consumable_data.get("filename", "unknown")

    with (
        ProgressManager(filename, self.request.id) as progress,
        TemporaryDirectory(dir=storage_config.scratch_dir) as tmp_dir,
    ):
        runner = PipelineRunner(progress_manager=progress, tmp_dir=Path(tmp_dir))
        result = runner.run(consumable_data)

    return result


@shared_task(
    bind=True,
    time_limit=900,
    soft_time_limit=600,
    queue="ocr",
    max_retries=2,
    default_retry_delay=30,
)
def reprocess_document(self: Task, document_id: int):
    """
    Re-OCR an existing document and update content.

    Sourced from Paperless tasks.py:246-351
    update_document_content_maybe_archive_file().
    """
    from app.services.parsers.registry import ParserRegistry
    from app.services.storage.file_manager import FileManager

    with get_sync_session() as db:
        document = db.get(Document, document_id)
        if not document:
            logger.error(f"Document {document_id} not found")
            return

        parser = ParserRegistry.get_parser(document.mime_type)
        if not parser:
            logger.error(f"No parser for {document.mime_type}")
            return

        try:
            result = parser.parse(document.source_path)
            document.content_text = result.text
            document.word_count = len(result.text.split())
            document.page_count = result.page_count

            # Update archive if parser generates one
            if result.archive_path:
                fm = FileManager()
                document.archive_path = fm.store_archive(result.archive_path, document)
                document.archive_checksum = fm.compute_checksum(result.archive_path)

            db.commit()

            # Re-index for search
            from app.services.search.tasks import reindex_document
            reindex_document.delay(document_id)

        except Exception as e:
            logger.exception(f"Error reprocessing document {document_id}: {e}")
            raise self.retry(exc=e)

        finally:
            parser.cleanup()


@shared_task(time_limit=600)
def bulk_update_documents(document_ids: list[int]):
    """
    Re-index multiple documents.

    Sourced from Paperless tasks.py:226-244 bulk_update_documents().
    """
    with get_sync_session() as db:
        for doc_id in document_ids:
            # Re-run classification
            from app.services.classification.auto_assign import auto_classify_document
            auto_classify_document(doc_id, db)

            # Re-index for search
            from app.services.search.tasks import reindex_document
            reindex_document.delay(doc_id)


# =============================================================================
# PERIODIC TASKS (Celery Beat)
# =============================================================================

@shared_task(time_limit=300)
def search_index_maintenance():
    """
    Periodic index maintenance.

    Paperless equivalent: tasks.py:63-78 index_optimize() +
    index_reindex().

    PostgreSQL GIN indexes are self-managing, but VACUUM ANALYZE
    updates query planner statistics.
    """
    with get_sync_session() as db:
        from sqlalchemy import text
        db.execute(text("VACUUM ANALYZE documents"))
    logger.info("Search index maintenance complete")


@shared_task(time_limit=300)
def cleanup_expired_shares():
    """Remove expired share links."""
    with get_sync_session() as db:
        from app.models.document_permission import ShareLink
        expired = db.execute(
            select(ShareLink).where(
                ShareLink.expiration.isnot(None),
                ShareLink.expiration < datetime.utcnow(),
            )
        ).scalars().all()

        count = len(expired)
        for link in expired:
            db.delete(link)
        db.commit()
        logger.info(f"Cleaned up {count} expired share links")


@shared_task(time_limit=300)
def cleanup_old_tasks():
    """Clean up task records older than 30 days."""
    from app.models.task import SynapseTask
    threshold = datetime.utcnow() - timedelta(days=30)

    with get_sync_session() as db:
        old_tasks = db.execute(
            select(SynapseTask).where(
                SynapseTask.date_done.isnot(None),
                SynapseTask.date_done < threshold,
                SynapseTask.acknowledged == True,
            )
        ).scalars().all()

        count = len(old_tasks)
        for task in old_tasks:
            db.delete(task)
        db.commit()
        logger.info(f"Cleaned up {count} old task records")
```

### Celery Configuration

```python
# backend/app/core/celery_config.py

from celery.schedules import crontab

# Queue configuration — separate CPU-intensive from lightweight tasks
CELERY_TASK_QUEUES = {
    "default": {
        "exchange": "default",
        "routing_key": "default",
    },
    "ocr": {
        "exchange": "ocr",
        "routing_key": "ocr",
    },
    "ingestion": {
        "exchange": "ingestion",
        "routing_key": "ingestion",
    },
}

CELERY_TASK_DEFAULT_QUEUE = "default"

# Beat schedule — periodic tasks
# Sourced from Paperless celery.py + tasks.py
CELERY_BEAT_SCHEDULE = {
    "check-scheduled-workflows": {
        "task": "app.services.workflows.scheduler.check_scheduled_workflows",
        "schedule": crontab(minute="*/15"),
        "options": {"queue": "default"},
    },
    "cleanup-expired-shares": {
        "task": "app.services.background.tasks.cleanup_expired_shares",
        "schedule": crontab(hour=3, minute=0),  # 3 AM daily
        "options": {"queue": "default"},
    },
    "empty-trash": {
        "task": "app.services.storage.sanity_check.empty_trash",
        "schedule": crontab(hour=4, minute=0),  # 4 AM daily
        "options": {"queue": "default"},
    },
    "sanity-check": {
        "task": "app.services.storage.sanity_check.sanity_check",
        "schedule": crontab(hour=5, minute=0),  # 5 AM daily
        "options": {"queue": "default"},
    },
    "search-index-maintenance": {
        "task": "app.services.background.tasks.search_index_maintenance",
        "schedule": crontab(hour=2, minute=0),  # 2 AM daily
        "options": {"queue": "default"},
    },
    "cleanup-old-tasks": {
        "task": "app.services.background.tasks.cleanup_old_tasks",
        "schedule": crontab(hour=6, minute=0),  # 6 AM daily
        "options": {"queue": "default"},
    },
}
```

---

## Module Structure

```
backend/app/services/background/
├── __init__.py
├── tasks.py                   # All on-demand + periodic task definitions
├── progress.py                # ProgressManager for real-time updates

backend/app/models/
├── task.py                    # SynapseTask status tracking

backend/app/core/
├── celery_config.py           # Queues + beat schedule (extends celery_app.py)
```

---

## Engineering Tasks

1. **Create `SynapseTask` model** — task status tracking with task_id, status, result, timestamps
2. **Create `ProgressManager`** — log-based now, WebSocket/SSE wiring later
3. **Implement `consume_document`** task — acks_late, reject_on_worker_lost, plugin pipeline
4. **Implement `reprocess_document`** task — re-OCR with retry logic
5. **Implement `bulk_update_documents`** task — batch re-classify + re-index
6. **Implement `sanity_check`** periodic task (defined in 05-storage doc)
7. **Implement `empty_trash`** periodic task (defined in 05-storage doc)
8. **Implement `check_scheduled_workflows`** periodic task (defined in 06-workflow doc)
9. **Implement cleanup tasks** — expired shares, old tasks
10. **Configure Celery queues** — default, ocr, ingestion
11. **Configure Celery Beat schedule** — 6 periodic tasks
12. **Add task status API endpoint** — list/acknowledge tasks for frontend
13. **Write tests** — task execution, progress reporting, cleanup logic
