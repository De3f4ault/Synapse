"""
Celery worker configuration and management.

Configures Celery application with broker, backend,
and task routing for distributed task execution.
"""

import logging
from typing import Optional
from celery import Celery
from kombu import Exchange, Queue

logger = logging.getLogger(__name__)


class BackgroundWorker:
    """
    Celery worker configuration and management.

    Provides centralized configuration for Celery workers
    with proper routing, rate limiting, and monitoring.
    """

    def __init__(
        self,
        app_name: str = "rag_app",
        broker_url: str = "redis://localhost:6379/0",
        result_backend: Optional[str] = None,
    ):
        """
        Initialize Celery worker.

        Args:
            app_name: Application name
            broker_url: Message broker URL
            result_backend: Result backend URL
        """
        self.app_name = app_name
        self.broker_url = broker_url
        self.result_backend = result_backend or broker_url

        self.app = self._create_app()
        logger.info(f"Initialized BackgroundWorker: {app_name}")

    def _create_app(self) -> Celery:
        """
        Create and configure Celery application.

        Returns:
            Celery: Configured Celery app
        """
        app = Celery(
            self.app_name,
            broker=self.broker_url,
            backend=self.result_backend,
        )

        # Configure Celery
        app.conf.update(
            # Task execution
            task_serializer="json",
            accept_content=["json"],
            result_serializer="json",
            timezone="UTC",
            enable_utc=True,

            # Task routing
            task_routes={
                "tasks.send_email": {"queue": "emails"},
                "tasks.process_document": {"queue": "documents"},
                "tasks.generate_report": {"queue": "reports"},
                "tasks.*": {"queue": "default"},
            },

            # Task execution limits
            task_soft_time_limit=300,  # 5 minutes
            task_time_limit=600,  # 10 minutes

            # Task result settings
            result_expires=3600,  # 1 hour
            task_ignore_result=False,

            # Worker settings
            worker_prefetch_multiplier=4,
            worker_max_tasks_per_child=1000,

            # Rate limiting
            task_default_rate_limit="100/m",

            # Task tracking
            task_track_started=True,
            task_send_sent_event=True,
        )

        # Define queues
        app.conf.task_queues = (
            Queue("default", Exchange("default"), routing_key="default"),
            Queue("emails", Exchange("emails"), routing_key="emails", priority=9),
            Queue("documents", Exchange("documents"), routing_key="documents", priority=5),
            Queue("reports", Exchange("reports"), routing_key="reports", priority=3),
        )

        # Beat schedule for periodic tasks
        app.conf.beat_schedule = {
            "cleanup-temp-files-daily": {
                "task": "tasks.cleanup",
                "schedule": 86400.0,  # Daily
                "args": ("temp_files",),
            },
            "weekly-reports": {
                "task": "tasks.scheduled_weekly_report",
                "schedule": 604800.0,  # Weekly
            },
        }

        logger.info("Celery app configured successfully")
        return app

    def get_app(self) -> Celery:
        """
        Get Celery application.

        Returns:
            Celery: Celery app instance
        """
        return self.app

    def start_worker(
        self,
        queues: Optional[list[str]] = None,
        concurrency: int = 4,
        loglevel: str = "INFO",
    ) -> None:
        """
        Start Celery worker (for programmatic usage).

        Args:
            queues: Queue names to consume
            concurrency: Number of worker processes
            loglevel: Logging level
        """
        argv = [
            "worker",
            f"--loglevel={loglevel}",
            f"--concurrency={concurrency}",
        ]

        if queues:
            argv.append(f"--queues={','.join(queues)}")

        logger.info(f"Starting worker with args: {argv}")
        self.app.worker_main(argv)

    def send_task(
        self,
        task_name: str,
        args: tuple = (),
        kwargs: dict = None,
        queue: Optional[str] = None,
        countdown: Optional[int] = None,
        eta: Optional[int] = None,
    ):
        """
        Send task to queue.

        Args:
            task_name: Task name
            args: Task arguments
            kwargs: Task keyword arguments
            queue: Queue name
            countdown: Delay in seconds
            eta: ETA timestamp

        Returns:
            AsyncResult: Task result handle
        """
        kwargs = kwargs or {}

        options = {}
        if queue:
            options["queue"] = queue
        if countdown:
            options["countdown"] = countdown
        if eta:
            options["eta"] = eta

        return self.app.send_task(
            task_name,
            args=args,
            kwargs=kwargs,
            **options
        )


# Global worker instance (to be initialized by application)
_worker: Optional[BackgroundWorker] = None


def init_worker(
    app_name: str = "rag_app",
    broker_url: str = "redis://localhost:6379/0",
    result_backend: Optional[str] = None,
) -> BackgroundWorker:
    """
    Initialize global worker instance.

    Args:
        app_name: Application name
        broker_url: Broker URL
        result_backend: Result backend URL

    Returns:
        BackgroundWorker: Worker instance
    """
    global _worker
    _worker = BackgroundWorker(app_name, broker_url, result_backend)
    return _worker


def get_worker() -> BackgroundWorker:
    """
    Get global worker instance.

    Returns:
        BackgroundWorker: Worker instance

    Raises:
        RuntimeError: If worker not initialized
    """
    if _worker is None:
        raise RuntimeError("Worker not initialized. Call init_worker() first.")
    return _worker
