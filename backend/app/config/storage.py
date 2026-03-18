"""
DMS Storage configuration.

Directory layout and filename template settings for the document
management system. All values overridable via SYNAPSE_STORAGE_* env vars.

Sourced from Paperless-ngx settings:
  - ORIGINALS_DIR, ARCHIVE_DIR, THUMBNAIL_DIR, SCRATCH_DIR
  - FILENAME_FORMAT (default template)
"""

import os

from pydantic_settings import BaseSettings


class StorageConfig(BaseSettings):
    """
    Storage directory and filename template configuration.

    Environment variables (prefix: SYNAPSE_STORAGE_):
      SYNAPSE_STORAGE_ORIGINALS_DIR  — pristine source files
      SYNAPSE_STORAGE_ARCHIVE_DIR    — PDF/A archive copies
      SYNAPSE_STORAGE_THUMBNAIL_DIR  — document thumbnails
      SYNAPSE_STORAGE_SCRATCH_DIR    — temporary processing
      SYNAPSE_STORAGE_CONSUMPTION_DIR — watched folder for auto-ingest
      SYNAPSE_STORAGE_DEFAULT_FILENAME_FORMAT — template string
    """
    originals_dir: str = "data/originals"
    archive_dir: str = "data/archive"
    thumbnail_dir: str = "data/thumbnails"
    scratch_dir: str = "/tmp/synapse_scratch"
    consumption_dir: str = "data/consume"

    # Default filename template (Paperless file_handling.py L136-143)
    # Used when no StoragePath is assigned to the document
    default_filename_format: str = "{created_year}/{correspondent}/{title}"

    class Config:
        env_prefix = "SYNAPSE_STORAGE_"


# Singleton instance
storage_config = StorageConfig()
