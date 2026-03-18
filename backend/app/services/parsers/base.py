"""
Base document parser interface.

All parsers implement this ABC. Lifecycle:
    parser = SomeParser()
    parser.parse(file_path, mime_type, filename)
    text = parser.get_text()
    archive = parser.get_archive_path()
    parser.cleanup()

Sourced from Paperless-ngx parsers.py — adapted for Synapse.
"""

import abc
import logging
import shutil
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class BaseDocumentParser(abc.ABC):
    """
    Abstract base class for all document parsers.

    Subclasses must implement:
      - parse(file_path, mime_type, filename)
      - get_thumbnail(file_path, mime_type)
    """

    def __init__(self, logging_group: str = ""):
        self.logging_group = logging_group
        self._text: Optional[str] = None
        self._date: Optional[datetime] = None
        self._archive_path: Optional[str] = None
        self._page_count: Optional[int] = None
        self._metadata: dict = {}
        self._tempdir: Optional[str] = None

    @property
    def tempdir(self) -> str:
        """Lazy-create temporary directory for parser scratch files."""
        if self._tempdir is None:
            self._tempdir = tempfile.mkdtemp(prefix="synapse_parser_")
        return self._tempdir

    @abc.abstractmethod
    def parse(self, file_path: str, mime_type: str, filename: str) -> None:
        """
        Parse the document and populate internal state.

        Must set:
          - self._text       (extracted text content)
          - self._archive_path (path to PDF/A archive, if generated)
          - self._date       (document date, if extractable)
          - self._page_count (number of pages)
          - self._metadata   (any additional metadata dict)
        """
        ...

    def get_text(self) -> str:
        """Return extracted text content."""
        return self._text or ""

    def get_date(self) -> Optional[datetime]:
        """Return extracted document date, or None."""
        return self._date

    def get_archive_path(self) -> Optional[str]:
        """Return path to generated PDF/A archive, or None."""
        return self._archive_path

    def get_page_count(self) -> int:
        """Return page count (0 if unknown)."""
        return self._page_count or 0

    def get_metadata(self) -> dict:
        """Return additional metadata extracted during parsing."""
        return self._metadata

    @abc.abstractmethod
    def get_thumbnail(self, file_path: str, mime_type: str) -> Optional[str]:
        """Generate a thumbnail image. Returns path to thumbnail file, or None."""
        ...

    def cleanup(self):
        """Remove temporary files created during parsing."""
        if self._tempdir:
            shutil.rmtree(self._tempdir, ignore_errors=True)
            self._tempdir = None
            logger.debug("Parser temp directory cleaned up")
