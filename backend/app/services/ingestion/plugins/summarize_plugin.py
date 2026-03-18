"""
Auto-summarize plugin — generates AI summary on document ingest.

Post-consumption plugin wired after IndexPlugin in the pipeline.
Uses Gemini to generate a concise summary and stores it on the
Document record.

Sourced from spec 11-synapse-advantages.md SummarizePlugin concept.
"""

import logging

from .base import IngestionPlugin

logger = logging.getLogger(__name__)


class SummarizePlugin(IngestionPlugin):
    """
    Generate an AI summary for the ingested document.

    Runs after IndexPlugin (requires document_id and text).
    Best-effort — summary failure never aborts the pipeline.

    Sets on Document (via DB update):
        - ai_summary
    """

    async def run(self, doc) -> None:
        if not doc.document_id or not doc.text:
            logger.debug("SummarizePlugin skipped: no document_id or text")
            return

        # Skip if text is too short for meaningful summary
        if len(doc.text.strip()) < 200:
            logger.debug("SummarizePlugin skipped: text too short (%d chars)", len(doc.text))
            return

        try:
            from app.db.session import get_db_session
            from app.models.document import Document

            async with get_db_session() as db:
                document = await db.get(Document, doc.document_id)
                if not document:
                    return

                # Skip if already has a summary
                if document.ai_summary:
                    logger.debug("Document %d already has summary, skipping", doc.document_id)
                    return

                # Generate summary via Gemini
                from app.core.config import settings
                from google import genai

                client = genai.Client(api_key=settings.GEMINI_API_KEY)

                # Truncate to avoid token limits
                content = doc.text[:30000]
                prompt = (
                    f"Provide a concise summary of this document in 2-3 paragraphs.\n"
                    f"Focus on the main topics, key takeaways, and important concepts.\n\n"
                    f"Document Title: {doc.original_filename}\n\n"
                    f"Content:\n{content}"
                )

                response = client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=prompt,
                )
                summary = response.text

                document.ai_summary = summary
                await db.commit()

                logger.info(
                    "Auto-summary generated for document %d (%d chars)",
                    doc.document_id, len(summary),
                )

        except Exception as e:
            # Best-effort — never abort the pipeline over summary failure
            logger.warning(
                "Auto-summarize failed for document %d: %s",
                doc.document_id, e,
            )
