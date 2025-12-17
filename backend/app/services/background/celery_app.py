"""
Celery application configuration for SYNAPSE - OPTIMIZED.

This module creates and configures the Celery app instance
that will be used for all background task processing.

Optimizations applied:
- Reduced prefetch_multiplier to prevent task hogging
- Added memory limits to prevent worker bloat
- Optimized Redis connection pooling
- Reduced visibility timeout for faster task recovery
"""

import os
from celery import Celery
from kombu import Exchange, Queue

from app.core.config import settings

# Create Celery app
celery_app = Celery(
    "synapse",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
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

    # Redis broker optimization
    broker_pool_limit=10,  # Max connections per worker
    broker_connection_retry_on_startup=True,
    broker_visibility_timeout=900,  # 15 min (was 3600), faster task recovery

    # Worker - OPTIMIZED FOR CPU-BOUND TASKS
    worker_prefetch_multiplier=1,  # Prevent task hogging (was 4)
    worker_max_tasks_per_child=50,  # Recycle workers frequently (was 1000)
    worker_max_memory_per_child=500000,  # 500MB limit, kill if exceeded

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
    },

    # Queues
    task_queues=(
        Queue("default", Exchange("default"), routing_key="default"),
        Queue("documents", Exchange("documents"), routing_key="documents", priority=5),
        Queue("emails", Exchange("emails"), routing_key="emails", priority=9),
        Queue("reports", Exchange("reports"), routing_key="reports", priority=3),
        # RAG queue - high priority for document ingestion
        Queue("rag", Exchange("rag"), routing_key="rag", priority=7),
    ),

    # Beat schedule for periodic tasks
    beat_schedule={
        "retry-failed-webhooks": {
            "task": "app.services.background.tasks.retry_failed_webhooks_task",
            "schedule": 300.0,
        },
        "cleanup-temp-files": {
            "task": "app.services.background.tasks.cleanup_task",
            "schedule": 86400.0,
            "args": ("temp_files",),
        },
    },
)

# Auto-discover tasks
celery_app.autodiscover_tasks(["app.services.background"])
