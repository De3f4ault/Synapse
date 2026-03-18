"""
Parser plugin — text extraction via the unified parser registry.

Selects parser by MIME type, runs it, and populates the
IngestDocument with extracted text, archive path, metadata, and date.
"""

import logging

from .base import IngestionPlugin

logger = logging.getLogger(__name__)


class ParserPlugin(IngestionPlugin):
    """
    Run the appropriate parser based on MIME type.

    Sets on IngestDocument:
        - text (extracted content)
        - archive_path (parser-generated PDF/A)
        - page_count
        - created_date
        - metadata
    """

    async def run(self, doc) -> None:
        from app.services.ingestion.pipeline import ConsumerStatusCode
        from app.services.parsers import get_parser_for_mime_type

        parser_class = get_parser_for_mime_type(doc.mime_type)
        if parser_class is None:
            doc.status = ConsumerStatusCode.UNSUPPORTED_TYPE
            doc.error_message = f"No parser for MIME type: {doc.mime_type}"
            return

        parser = parser_class()
        try:
            parser.parse(doc.source_path, doc.mime_type, doc.original_filename)

            doc.text = parser.get_text()
            doc.archive_path = parser.get_archive_path()
            doc.page_count = parser.get_page_count()
            doc.created_date = parser.get_date()
            doc.metadata = parser.get_metadata()

            # Generate thumbnail
            try:
                thumbnail = parser.get_thumbnail(doc.source_path, doc.mime_type)
                if thumbnail:
                    doc.thumbnail_path = thumbnail
            except Exception as e:
                logger.debug("Thumbnail generation skipped: %s", e)

            logger.info(
                "Parsed %s: %d chars, %d pages, archive=%s",
                doc.original_filename,
                len(doc.text),
                doc.page_count,
                "yes" if doc.archive_path else "no",
            )

        except Exception as e:
            logger.error("Parser failed for %s: %s", doc.original_filename, e, exc_info=True)
            doc.status = ConsumerStatusCode.PARSER_FAILED
            doc.error_message = f"Parser error: {e}"
        finally:
            parser.cleanup()
