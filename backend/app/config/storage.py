"""
Storage configuration for DMS document management.

Provides directory layout configuration for originals, archives,
thumbnails, consumption, and scratch space.

All paths read from environment variables with SYNAPSE_STORAGE_ prefix.
Falls back to sensible defaults under data/.
"""

import os
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# Base data directory — all storage relative to this
# ---------------------------------------------------------------------------
_DEFAULT_DATA_DIR = os.getenv("SYNAPSE_DATA_DIR", "data")


class StorageConfig:
    """
    DMS storage directory configuration.

    Reads from environment variables:
        SYNAPSE_STORAGE_ORIGINALS_DIR  — original uploaded files
        SYNAPSE_STORAGE_ARCHIVE_DIR    — PDF/A archive copies
        SYNAPSE_STORAGE_THUMBNAIL_DIR  — generated thumbnails
        SYNAPSE_STORAGE_CONSUMPTION_DIR — auto-consumption watch folder
        SYNAPSE_STORAGE_SCRATCH_DIR    — temporary processing scratch space
        SYNAPSE_STORAGE_FILENAME_FORMAT — template for stored filenames
    """

    def __init__(self):
        base = Path(_DEFAULT_DATA_DIR)
        self.originals_dir = Path(
            os.getenv("SYNAPSE_STORAGE_ORIGINALS_DIR", str(base / "originals"))
        )
        self.archive_dir = Path(
            os.getenv("SYNAPSE_STORAGE_ARCHIVE_DIR", str(base / "archive"))
        )
        self.thumbnail_dir = Path(
            os.getenv("SYNAPSE_STORAGE_THUMBNAIL_DIR", str(base / "thumbnails"))
        )
        self.consumption_dir = Path(
            os.getenv("SYNAPSE_STORAGE_CONSUMPTION_DIR", str(base / "consumption"))
        )
        self.scratch_dir = Path(
            os.getenv("SYNAPSE_STORAGE_SCRATCH_DIR", str(base / "scratch"))
        )
        self.filename_format: str = os.getenv(
            "SYNAPSE_STORAGE_FILENAME_FORMAT",
            "{created_year}/{correspondent}/{title}",
        )

    def ensure_directories(self) -> None:
        """Create all configured storage directories if they don't exist."""
        for directory in [
            self.originals_dir,
            self.archive_dir,
            self.thumbnail_dir,
            self.consumption_dir,
            self.scratch_dir,
        ]:
            directory.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------
storage_config = StorageConfig()
