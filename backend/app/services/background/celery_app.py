"""
Celery application configuration for SYNAPSE - OPTIMIZED.

This module creates and configures the Celery app instance
that will be used for all background task processing.

Optimizations applied:
- Reduced prefetch_multiplier to prevent task hogging
- Added memory limits to prevent worker bloat
- Dynamic thread calculation based on CPU cores (paperless-ngx pattern)

Broker: PostgreSQL via SQLAlchemy transport (replaces Redis).
"""

import math
import multiprocessing
import os
from celery import Celery
from kombu import Exchange, Queue

from app.core.config import settings


# ============================================================
# DYNAMIC RESOURCE CONFIGURATION (paperless-ngx pattern)
# ============================================================
def default_threads_per_worker(task_workers: int) -> int:
    """
    Calculate threads per worker based on available CPU cores.

    Always leaves at least one core free for system operations.
    Based on paperless-ngx's resource management pattern.
    """
    try:
        available_cores = max(multiprocessing.cpu_count(), 1)
    except NotImplementedError:
        available_cores = 1
    return max(math.floor(available_cores / task_workers), 1)


# Worker configuration from environment
WORKER_CONCURRENCY = int(os.getenv("SYNAPSE_WORKER_CONCURRENCY", 2))
THREADS_PER_WORKER = int(
    os.getenv("SYNAPSE_THREADS_PER_WORKER", default_threads_per_worker(WORKER_CONCURRENCY))
)

# Build a synchronous PostgreSQL DSN for Celery's SQLAlchemy transport.
# DATABASE_URL uses asyncpg (postgresql+asyncpg://...) which Celery can't use,
# so we strip the async driver and prefix with sqla+ for kombu.
_sync_pg_url = str(settings.DATABASE_URL).replace("+asyncpg", "")
_broker_url = f"sqla+{_sync_pg_url}"
_backend_url = f"db+{_sync_pg_url}"

# Create Celery app
celery_app = Celery(
    "synapse",
    broker=_broker_url,
    backend=_backend_url,
)

# Configure Celery
celery_app.conf.update(
    # Serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    # Timezone
    timezone="UTC",
    enable_utc=True,
    # Task execution
    task_soft_time_limit=300,
    task_time_limit=600,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    # Results
    result_expires=3600,
    result_persistent=True,
    # Broker settings
    broker_pool_limit=10,
    broker_connection_retry_on_startup=True,
    # Worker - OPTIMIZED FOR CPU-BOUND TASKS
    worker_prefetch_multiplier=1,  # Prevent task hogging (was 4)
    worker_max_tasks_per_child=100,  # Increased to allow model caching (was 50)
    worker_max_memory_per_child=1500000,  # 1.5GB limit for embedding models (was 500MB)
    # Task tracking
    task_track_started=True,
    task_send_sent_event=True,
    # Task routes
    task_routes={
        "app.services.background.tasks.process_document_task": {"queue": "documents"},
        "app.services.background.tasks.send_email_task": {"queue": "emails"},
        "app.services.background.tasks.generate_report_task": {"queue": "reports"},
        # RAG tasks - dedicated queue
        "rag.ingest_document": {"queue": "rag"},
        "rag.batch_ingest": {"queue": "rag"},
        "rag.heavy_query": {"queue": "rag"},
        "rag.rebuild_index": {"queue": "rag"},
        # OCR tasks - dedicated queue (CPU-intensive)
        "ocr.process_document": {"queue": "ocr"},
        "ocr.batch_process": {"queue": "ocr"},
        # Embedding tasks - for pgvector sync
        "embedding.generate_note_embedding": {"queue": "embeddings"},
        "embedding.generate_flashcard_embedding": {"queue": "embeddings"},
        "embedding.batch_backfill_notes": {"queue": "embeddings"},
        "embedding.batch_backfill_flashcards": {"queue": "embeddings"},
        # Graph semantic linking
        "graph.semantic_link_scan": {"queue": "default"},
        "graph.semantic_refresh_user": {"queue": "default"},
        # DMS ingestion pipeline
        "ingestion.ingest_document": {"queue": "ingestion"},
        "ingestion.batch_ingest": {"queue": "ingestion"},
        # DMS storage maintenance
        "storage.sanity_check": {"queue": "default"},
        "storage.empty_trash": {"queue": "default"},
        # DMS workflows
        "workflows.check_scheduled_workflows": {"queue": "default"},
        # Learning signals (conversational mastery extraction)
        "learning.process_signals": {"queue": "default"},
        # Flashcard auto-categorisation (fires after AI deck generation)
        "flashcards.auto_categorise_deck": {"queue": "default"},
        # DMS sharing
        "sharing.cleanup_expired_links": {"queue": "default"},
        # Pipeline watchdog — low-priority, default queue, never blocks document work
        "tasks.recover_stalled_documents": {"queue": "default"},
        # ColBERT backfill — one-shot operator task, runs on rag queue
        "colbert.backfill_colbert": {"queue": "rag"},
    },
    # Queues
    task_queues=(
        Queue("default", Exchange("default"), routing_key="default"),
        Queue("documents", Exchange("documents"), routing_key="documents", priority=5),
        Queue("emails", Exchange("emails"), routing_key="emails", priority=9),
        Queue("reports", Exchange("reports"), routing_key="reports", priority=3),
        # RAG queue - high priority for document ingestion
        Queue("rag", Exchange("rag"), routing_key="rag", priority=7),
        # OCR queue - CPU-intensive, lower priority
        Queue("ocr", Exchange("ocr"), routing_key="ocr", priority=4),
        # Embeddings queue - for pgvector sync (medium priority)
        Queue("embeddings", Exchange("embeddings"), routing_key="embeddings", priority=6),
        # DMS ingestion queue
        Queue("ingestion", Exchange("ingestion"), routing_key="ingestion", priority=6),
    ),
    # Beat schedule for periodic tasks (with expires to prevent pileup)
    beat_schedule={
        "retry-failed-webhooks": {
            "task": "tasks.retry_failed_webhooks",
            "schedule": 300.0,
            "options": {"expires": 270.0},  # Expire before next run
        },
        "cleanup-temp-files": {
            "task": "app.services.background.tasks.cleanup_task",
            "schedule": 86400.0,
            "args": ("temp_files",),
            "options": {"expires": 82800.0},  # Expire 1 hour before next daily run
        },
        # Nightly semantic link scan: discover, decay, prune
        "nightly-semantic-link-scan": {
            "task": "graph.semantic_link_scan",
            "schedule": 86400.0,  # Every 24 hours
            "options": {"expires": 82800.0},
        },
        # DMS: Nightly storage sanity check
        "nightly-sanity-check": {
            "task": "storage.sanity_check",
            "schedule": 86400.0,  # Every 24 hours
            "options": {"expires": 82800.0},
        },
        # DMS: Weekly trash cleanup (hard-delete expired soft-deleted docs)
        "weekly-empty-trash": {
            "task": "storage.empty_trash",
            "schedule": 604800.0,  # Every 7 days
            "options": {"expires": 600000.0},
        },
        # DMS: Weekly sanity check (file integrity — Phase 7)
        "sanity-check-weekly": {
            "task": "storage.sanity_check",
            "schedule": 604800.0,  # Every 7 days
            "options": {"expires": 600000.0},
        },
        # DMS: Check scheduled workflows every 15 minutes (Phase 5)
        "check-scheduled-workflows": {
            "task": "workflows.check_scheduled_workflows",
            "schedule": 900.0,  # Every 15 minutes
            "options": {"expires": 870.0},
        },
        # DMS: Cleanup expired share links daily (Phase 6)
        "cleanup-expired-share-links": {
            "task": "sharing.cleanup_expired_links",
            "schedule": 86400.0,  # Daily
            "options": {"expires": 82800.0},
        },
        # Pipeline watchdog: recover documents stuck in PARSING/CHUNKING/PARSED/PENDING
        # Runs every 5 minutes. Thresholds defined in recover_stalled_documents().
        "recover-stalled-documents": {
            "task": "tasks.recover_stalled_documents",
            "schedule": 300.0,   # Every 5 minutes
            "options": {"expires": 270.0},  # Expire before next run to prevent pileup
        },
        # Admin: 90-day retention sweep on agent_metrics (converted to LOGGED).
        # Batched deletes — no table lock risk. Runs Sunday 02:00 UTC (low-traffic).
        "admin-purge-agent-metrics": {
            "task": "admin.purge_agent_metrics_retention",
            "schedule": 604800.0,   # Every 7 days (weekly)
            "options": {"expires": 600000.0},
        },
    },
)

# Auto-discover tasks
celery_app.autodiscover_tasks(["app.services.background"])
celery_app.autodiscover_tasks(["app.services.workflows"], related_name="scheduler")

# Import signals to register handlers
# This MUST be after celery_app is created
from app.services.background import signals  # noqa: F401, E402

# Explicitly import task modules that are NOT auto-discovered.
# autodiscover_tasks only finds 'tasks.py' (the default related_name).
# All other task files must be imported here so the worker registers them.
from app.services.background import learning_tasks  # noqa: F401, E402 — registers learning.process_signals, flashcards.auto_categorise_deck
from app.services.background import data_retention_tasks  # noqa: F401, E402 — registers admin.purge_agent_metrics_retention
