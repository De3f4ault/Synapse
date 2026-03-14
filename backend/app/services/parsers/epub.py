"""
EPUB document parser — electronic books via ebooklib.

Weight: 10 (standard priority).

Extracts chapter text, title/author metadata from EPUB files.
"""

import logging
from typing import Optional

from .base import BaseDocumentParser
from .utils import parse_date_from_text

logger = logging.getLogger(__name__)

SUPPORTED_MIME_TYPES = {"application/epub+zip"}
WEIGHT = 10


class EpubDocumentParser(BaseDocumentParser):
    """
    EPUB parser using ebooklib + BeautifulSoup.

    Extracts all chapter text and Dublin Core metadata.
    """

    def parse(self, file_path: str, mime_type: str, filename: str) -> None:
        """Parse EPUB and extract chapter text + metadata."""
        try:
            import ebooklib
            from ebooklib import epub
            from bs4 import BeautifulSoup

            book = epub.read_epub(file_path)

            # Extract text from all document items
            text_parts = []
            chapter_count = 0
            for item in book.get_items():
                if item.get_type() == ebooklib.ITEM_DOCUMENT:
                    chapter_count += 1
                    soup = BeautifulSoup(item.get_content(), "html.parser")
                    chapter_text = soup.get_text(separator="\n", strip=True)
                    if chapter_text:
                        text_parts.append(chapter_text)

            self._text = "\n\n".join(text_parts)
            self._page_count = max(1, len(self._text) // 3000)  # Rough estimate

            # Dublin Core metadata
            self._metadata = {}
            title = book.get_metadata("DC", "title")
            if title:
                self._metadata["title"] = title[0][0] if title else None
            creator = book.get_metadata("DC", "creator")
            if creator:
                self._metadata["author"] = creator[0][0] if creator else None
            language = book.get_metadata("DC", "language")
            if language:
                self._metadata["language"] = language[0][0] if language else None
            self._metadata["chapter_count"] = chapter_count

            # Date extraction
            dc_date = book.get_metadata("DC", "date")
            if dc_date and dc_date[0][0]:
                self._date = parse_date_from_text(dc_date[0][0], "")
            if not self._date:
                self._date = parse_date_from_text("", filename)

            logger.info(
                "Parsed EPUB %s: %d chapters, %d chars",
                filename, chapter_count, len(self._text or ""),
            )

        except ImportError:
            logger.error("ebooklib not installed — cannot parse EPUB files")
            self._text = ""
        except Exception as e:
            logger.error("EPUB parsing failed for %s: %s", file_path, e)
            self._text = ""

    def get_thumbnail(self, file_path: str, mime_type: str) -> Optional[str]:
        """
        Extract cover image from EPUB.

        EPUB files typically store a cover image we can use as a thumbnail.
        """
        try:
            import ebooklib
            from ebooklib import epub

            book = epub.read_epub(file_path)

            # Look for cover image
            for item in book.get_items():
                if item.get_type() == ebooklib.ITEM_COVER:
                    import os
                    cover_path = os.path.join(self.tempdir, "cover.jpg")
                    with open(cover_path, "wb") as f:
                        f.write(item.get_content())
                    return cover_path

            # Fallback: look for image with "cover" in name
            for item in book.get_items():
                if item.get_type() == ebooklib.ITEM_IMAGE:
                    if "cover" in (item.get_name() or "").lower():
                        import os
                        cover_path = os.path.join(self.tempdir, "cover.jpg")
                        with open(cover_path, "wb") as f:
                            f.write(item.get_content())
                        return cover_path

        except Exception as e:
            logger.debug("EPUB cover extraction failed: %s", e)
        return None
