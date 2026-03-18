"""
Text document parser — plain text, CSV, Markdown.

Weight: 10 (standard priority).

Handles encoding detection via charset-normalizer. No archive
generation (text files don't need PDF/A conversion).
"""

import logging
from pathlib import Path
from typing import Optional

from .base import BaseDocumentParser
from .utils import parse_date_from_text

logger = logging.getLogger(__name__)

SUPPORTED_MIME_TYPES = {
    "text/plain",
    "text/csv",
    "text/markdown",
    "text/x-markdown",
    "text/html",
    "text/xml",
    "application/json",
    "application/xml",
}
WEIGHT = 10


class TextDocumentParser(BaseDocumentParser):
    """
    Plain text parser with encoding detection.

    No archive generation — text files are already human-readable.
    """

    def parse(self, file_path: str, mime_type: str, filename: str) -> None:
        """Read text file with encoding detection."""
        self._text = self._read_with_fallback(file_path)
        self._page_count = 1
        self._metadata = {
            "encoding": self._detected_encoding,
            "line_count": self._text.count("\n") + 1 if self._text else 0,
            "char_count": len(self._text) if self._text else 0,
        }

        # Date extraction from filename (text content dates are too noisy)
        self._date = parse_date_from_text("", filename)

        logger.info(
            "Parsed text file %s: %d chars, encoding=%s",
            filename, len(self._text or ""),
            self._detected_encoding or "unknown",
        )

    def get_thumbnail(self, file_path: str, mime_type: str) -> Optional[str]:
        """Text files don't have meaningful thumbnails."""
        return None

    def _read_with_fallback(self, file_path: str) -> str:
        """
        Read file with charset detection fallback.

        1. Try UTF-8 first (most common)
        2. Use charset-normalizer for detection
        3. Fall back to latin-1 (never fails)
        """
        self._detected_encoding = None

        # Try UTF-8 first
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            self._detected_encoding = "utf-8"
            return content
        except UnicodeDecodeError:
            pass

        # Try charset detection
        try:
            from charset_normalizer import from_path
            result = from_path(file_path)
            best = result.best()
            if best:
                self._detected_encoding = best.encoding
                return str(best)
        except Exception as e:
            logger.debug("charset-normalizer failed: %s", e)

        # Ultimate fallback: latin-1 never raises
        try:
            with open(file_path, "r", encoding="latin-1") as f:
                content = f.read()
            self._detected_encoding = "latin-1"
            return content
        except Exception as e:
            logger.error("Failed to read text file %s: %s", file_path, e)
            return ""
