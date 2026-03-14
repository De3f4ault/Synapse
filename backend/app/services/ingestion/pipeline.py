"""
Ingestion pipeline — plugin-based document processing.

Orchestrates the document ingestion lifecycle:
    preflight → parse → store → index

Each stage is an IngestionPlugin that receives an IngestDocument
and can modify it or abort the pipeline.

Sourced from Paperless-ngx consumer.py — adapted for Synapse.
"""

import enum
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)


class ConsumerStatusCode(enum.Enum):
    """Pipeline execution result codes."""
    OK = "ok"
    DOCUMENT_ALREADY_EXISTS = "duplicate"
    FILE_NOT_FOUND = "file_not_found"
    UNSUPPORTED_TYPE = "unsupported_type"
    PARSER_FAILED = "parser_failed"
    STORAGE_FAILED = "storage_failed"
    DB_ERROR = "db_error"
    UNKNOWN_ERROR = "unknown_error"


@dataclass
class IngestDocument:
    """
    State object carried through the ingestion pipeline.

    Each plugin reads from and writes to this object.
    """
    # Input
    source_path: str                          # Path to uploaded file on disk
    original_filename: str                    # User-visible filename
    user_id: int                              # Owning user ID
    mime_type: Optional[str] = None           # Detected MIME type
    folder_id: Optional[int] = None           # Target folder

    # Populated by PreflightPlugin
    content_hash: Optional[str] = None        # SHA-256 of original file
    file_size: int = 0                        # File size in bytes

    # Populated by ParserPlugin
    text: str = ""                            # Extracted text content
    archive_path: Optional[str] = None        # Parser-generated archive PDF
    page_count: int = 0                       # Number of pages
    created_date: Optional[datetime] = None   # Extracted document date
    metadata: dict = field(default_factory=dict)  # Parser metadata

    # Populated by StorePlugin
    stored_original_path: Optional[str] = None  # Final original path
    stored_archive_path: Optional[str] = None   # Final archive path
    archive_checksum: Optional[str] = None      # Archive SHA-256
    thumbnail_path: Optional[str] = None         # Thumbnail path

    # Populated by IndexPlugin
    document_id: Optional[int] = None           # DB record ID

    # Pipeline state
    status: ConsumerStatusCode = ConsumerStatusCode.OK
    error_message: Optional[str] = None


class PipelineRunner:
    """
    Sequential plugin executor for document ingestion.

    Usage:
        runner = PipelineRunner()
        runner.add_plugin(PreflightPlugin())
        runner.add_plugin(ParserPlugin())
        runner.add_plugin(StorePlugin())
        runner.add_plugin(IndexPlugin())

        doc = IngestDocument(
            source_path="/tmp/upload.pdf",
            original_filename="invoice.pdf",
            user_id=1,
        )
        result = await runner.run(doc)
    """

    def __init__(self):
        self._plugins: list = []

    def add_plugin(self, plugin) -> "PipelineRunner":
        """Add a plugin to the pipeline. Returns self for chaining."""
        self._plugins.append(plugin)
        return self

    async def run(
        self,
        doc: IngestDocument,
        progress_callback=None,
    ) -> IngestDocument:
        """
        Execute all plugins sequentially.

        Each plugin can:
        - Modify the doc (add extracted text, paths, etc.)
        - Set doc.status to a non-OK value to abort
        - Raise an exception (caught and logged)

        Args:
            doc: The document being ingested.
            progress_callback: Optional callable(plugin_name, step, total).

        Returns:
            The modified IngestDocument with final status.
        """
        total = len(self._plugins)
        start_time = time.time()

        logger.info(
            "Pipeline starting for %s (%d plugins)",
            doc.original_filename, total,
        )

        for i, plugin in enumerate(self._plugins):
            plugin_name = type(plugin).__name__

            if progress_callback:
                try:
                    progress_callback(plugin_name, i + 1, total)
                except Exception:
                    pass  # Never let progress reporting break the pipeline

            try:
                logger.debug("Running plugin %d/%d: %s", i + 1, total, plugin_name)
                await plugin.run(doc)

                # Check if plugin signalled an abort
                if doc.status != ConsumerStatusCode.OK:
                    logger.warning(
                        "Plugin %s aborted pipeline: %s (%s)",
                        plugin_name, doc.status.value, doc.error_message,
                    )
                    break

            except Exception as e:
                logger.error(
                    "Plugin %s failed with exception: %s", plugin_name, e,
                    exc_info=True,
                )
                doc.status = ConsumerStatusCode.UNKNOWN_ERROR
                doc.error_message = f"{plugin_name}: {e}"
                break

        elapsed = time.time() - start_time
        logger.info(
            "Pipeline %s for %s in %.2fs (document_id=%s)",
            "completed" if doc.status == ConsumerStatusCode.OK else f"failed ({doc.status.value})",
            doc.original_filename, elapsed, doc.document_id,
        )

        return doc
