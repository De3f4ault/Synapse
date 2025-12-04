"""
Celery application configuration for SYNAPSE.

This module creates and configures the Celery app instance
that will be used for all background task processing.
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

    # Worker
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,

    # Task tracking
    task_track_started=True,
    task_send_sent_event=True,

    # Task routes
    task_routes={
        "app.services.background.tasks.process_document_task": {"queue": "documents"},
        "app.services.background.tasks.send_email_task": {"queue": "emails"},
        "app.services.background.tasks.generate_report_task": {"queue": "reports"},
    },

    # Queues
    task_queues=(
        Queue("default", Exchange("default"), routing_key="default"),
        Queue("documents", Exchange("documents"), routing_key="documents", priority=5),
        Queue("emails", Exchange("emails"), routing_key="emails", priority=9),
        Queue("reports", Exchange("reports"), routing_key="reports", priority=3),
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
