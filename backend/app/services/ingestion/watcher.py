"""
Consumption directory watcher.

Monitors a configured directory for new files and dispatches them
to the DMS ingestion pipeline via Celery.

Can be run as:
- A standalone process (python -m app.services.ingestion.watcher)
- Triggered periodically by Celery Beat

Sourced from Paperless-ngx's consumption directory concept.
"""

import logging
import os
import time
from pathlib import Path
from typing import Set

logger = logging.getLogger(__name__)


class ConsumptionWatcher:
    """
    Watches a directory for new files and dispatches ingestion tasks.

    Uses simple polling (no OS-specific watchers) for maximum portability.
    Files are dispatched only after they stabilize (stop growing), to
    avoid processing partially-written files.

    Usage:
        watcher = ConsumptionWatcher(consume_dir="/path/to/consume")
        watcher.run_once()  # Single scan (for Celery Beat)
        watcher.run_forever(interval=5)  # Continuous watch (standalone)
    """

    # Files currently being written (size hasn't stabilized)
    _pending: dict  # path → last_seen_size

    def __init__(
        self,
        consume_dir: str = None,
        user_id: int = None,
        stability_seconds: float = 2.0,
    ):
        """
        Args:
            consume_dir: Directory to watch. Defaults to StorageConfig.consumption_dir.
            user_id: Default user ID for consumed documents (optional).
            stability_seconds: How long a file must be unchanged before processing.
        """
        if consume_dir is None:
            from app.config.storage import storage_config
            consume_dir = storage_config.consumption_dir

        self.consume_dir = Path(consume_dir)
        self.user_id = user_id
        self.stability_seconds = stability_seconds
        self._pending = {}
        self._dispatched: Set[str] = set()

    def run_once(self) -> int:
        """
        Scan the consumption directory once and dispatch stable files.

        Returns:
            Number of files dispatched for ingestion.
        """
        if not self.consume_dir.exists():
            logger.debug("Consumption directory does not exist: %s", self.consume_dir)
            return 0

        dispatched = 0

        for entry in sorted(self.consume_dir.iterdir()):
            # Skip directories, hidden files, and already-dispatched files
            if entry.is_dir():
                continue
            if entry.name.startswith("."):
                continue
            if str(entry) in self._dispatched:
                continue

            try:
                current_size = entry.stat().st_size
            except OSError:
                continue

            # Skip empty files
            if current_size == 0:
                continue

            path_str = str(entry)

            # Check stability — file must stop growing
            if path_str in self._pending:
                prev_size, first_seen = self._pending[path_str]
                if current_size == prev_size:
                    elapsed = time.time() - first_seen
                    if elapsed >= self.stability_seconds:
                        # File is stable — dispatch
                        self._dispatch(entry)
                        del self._pending[path_str]
                        self._dispatched.add(path_str)
                        dispatched += 1
                    # else: wait longer
                else:
                    # Still growing — update size
                    self._pending[path_str] = (current_size, time.time())
            else:
                # First time seeing this file — start stability timer
                self._pending[path_str] = (current_size, time.time())

        return dispatched

    def run_forever(self, interval: float = 5.0) -> None:
        """
        Continuously watch the directory.

        Args:
            interval: Seconds between scans.
        """
        logger.info(
            "Starting consumption watcher on %s (interval=%ss)",
            self.consume_dir, interval,
        )

        try:
            while True:
                dispatched = self.run_once()
                if dispatched:
                    logger.info("Dispatched %d files for ingestion", dispatched)
                time.sleep(interval)
        except KeyboardInterrupt:
            logger.info("Consumption watcher stopped")

    def _dispatch(self, file_path: Path) -> None:
        """Dispatch a file for ingestion via Celery."""
        from app.services.background.tasks import consume_document

        logger.info("Dispatching for ingestion: %s", file_path.name)

        consumable_data = {
            "source_path": str(file_path),
            "original_filename": file_path.name,
            "user_id": self.user_id or self._get_default_user_id(),
        }

        consume_document.delay(consumable_data)

    @staticmethod
    def _get_default_user_id() -> int:
        """Get the first (admin) user ID as fallback."""
        try:
            from app.db.session import SessionLocal
            from app.models.user import User
            from sqlalchemy import select

            with SessionLocal() as db:
                user = db.execute(
                    select(User).order_by(User.id).limit(1)
                ).scalar_one_or_none()
                return user.id if user else 1
        except Exception:
            return 1


# CLI entry point for standalone operation
if __name__ == "__main__":
    import argparse
    import sys

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")

    parser = argparse.ArgumentParser(description="DMS Consumption Directory Watcher")
    parser.add_argument("--dir", help="Directory to watch")
    parser.add_argument("--user-id", type=int, help="Default user ID")
    parser.add_argument("--interval", type=float, default=5.0, help="Scan interval (seconds)")
    args = parser.parse_args()

    watcher = ConsumptionWatcher(
        consume_dir=args.dir,
        user_id=args.user_id,
    )
    watcher.run_forever(interval=args.interval)
