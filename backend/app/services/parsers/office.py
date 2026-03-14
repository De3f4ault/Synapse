"""
Office document parser — DOCX, XLSX, PPTX.

Weight: 10 (standard priority).

Uses python-docx for Word documents, openpyxl for spreadsheets.
Archive PDF generation via LibreOffice CLI if available.

Sourced from Paperless-ngx OfficeDocumentParser concepts.
"""

import logging
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

from .base import BaseDocumentParser
from .utils import parse_date_from_text

logger = logging.getLogger(__name__)

SUPPORTED_MIME_TYPES = {
    # Word
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # .docx
    "application/msword",  # .doc
    # Excel
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  # .xlsx
    "application/vnd.ms-excel",  # .xls
    # PowerPoint
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",  # .pptx
    # OpenDocument
    "application/vnd.oasis.opendocument.text",  # .odt
    # RTF
    "application/rtf",
}
WEIGHT = 10


class OfficeDocumentParser(BaseDocumentParser):
    """
    Office document parser using python-docx/openpyxl.

    Extracts text from native format, optionally generates PDF/A
    via LibreOffice CLI for archive storage.
    """

    def parse(self, file_path: str, mime_type: str, filename: str) -> None:
        """Parse office document and extract text."""
        if "wordprocessing" in mime_type or "msword" in mime_type or "opendocument.text" in mime_type:
            self._text, self._metadata = self._extract_docx(file_path)
            self._page_count = self._estimate_page_count(self._text)
        elif "spreadsheet" in mime_type or "ms-excel" in mime_type:
            self._text, self._metadata = self._extract_xlsx(file_path)
            self._page_count = 1  # Spreadsheets don't have "pages" per se
        elif "presentation" in mime_type:
            self._text, self._metadata = self._extract_pptx(file_path)
        else:
            self._text = self._extract_generic(file_path)

        # Try to generate archive PDF via LibreOffice
        self._archive_path = self._convert_to_pdf(file_path)

        # Date extraction from content + filename
        self._date = parse_date_from_text(self._text or "", filename)

        logger.info(
            "Parsed office doc %s: %d chars, archive=%s",
            filename, len(self._text or ""),
            "yes" if self._archive_path else "no",
        )

    def get_thumbnail(self, file_path: str, mime_type: str) -> Optional[str]:
        """Generate thumbnail from converted PDF, or return None."""
        # If we have an archive PDF, generate thumbnail from that
        if self._archive_path:
            try:
                from app.services.document.service import generate_thumbnail
                return generate_thumbnail(self._archive_path, "application/pdf")
            except Exception as e:
                logger.debug("Thumbnail from archive failed: %s", e)
        return None

    def _extract_docx(self, file_path: str) -> tuple[str, dict]:
        """Extract text and metadata from DOCX file."""
        try:
            from docx import Document as DocxDocument

            doc = DocxDocument(file_path)
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            text = "\n".join(paragraphs)

            # Extract metadata from core properties
            metadata = {}
            props = doc.core_properties
            if props.author:
                metadata["author"] = props.author
            if props.title:
                metadata["title"] = props.title
            if props.subject:
                metadata["subject"] = props.subject
            if props.created:
                metadata["creation_date"] = str(props.created)

            return text, metadata
        except Exception as e:
            logger.warning("DOCX extraction failed for %s: %s", file_path, e)
            return "", {}

    def _extract_xlsx(self, file_path: str) -> tuple[str, dict]:
        """Extract text from XLSX file (all sheets, all cells)."""
        try:
            from openpyxl import load_workbook

            wb = load_workbook(file_path, read_only=True, data_only=True)
            text_parts = []

            for sheet_name in wb.sheetnames:
                ws = wb[sheet_name]
                text_parts.append(f"--- Sheet: {sheet_name} ---")
                for row in ws.iter_rows(values_only=True):
                    cells = [str(c) for c in row if c is not None]
                    if cells:
                        text_parts.append("\t".join(cells))

            wb.close()

            metadata = {"sheet_count": len(wb.sheetnames)}
            return "\n".join(text_parts), metadata
        except Exception as e:
            logger.warning("XLSX extraction failed for %s: %s", file_path, e)
            return "", {}

    def _extract_pptx(self, file_path: str) -> tuple[str, dict]:
        """Extract text from PPTX file (slide text)."""
        try:
            # python-pptx is optional — graceful degradation
            from pptx import Presentation

            prs = Presentation(file_path)
            text_parts = []
            slide_count = 0

            for slide in prs.slides:
                slide_count += 1
                for shape in slide.shapes:
                    if hasattr(shape, "text") and shape.text.strip():
                        text_parts.append(shape.text)

            self._page_count = slide_count
            return "\n".join(text_parts), {"slide_count": slide_count}
        except ImportError:
            logger.info("python-pptx not installed — skipping PPTX extraction")
            return "", {}
        except Exception as e:
            logger.warning("PPTX extraction failed for %s: %s", file_path, e)
            return "", {}

    def _extract_generic(self, file_path: str) -> str:
        """Fallback: try to read as text."""
        try:
            with open(file_path, "r", errors="replace") as f:
                return f.read()
        except Exception:
            return ""

    def _convert_to_pdf(self, file_path: str) -> Optional[str]:
        """
        Convert document to PDF via LibreOffice CLI.

        Returns path to generated PDF, or None if LibreOffice is not available.
        """
        try:
            outdir = self.tempdir
            result = subprocess.run(
                [
                    "soffice", "--headless", "--convert-to", "pdf",
                    "--outdir", outdir, file_path,
                ],
                capture_output=True, timeout=120,
            )
            if result.returncode == 0:
                # LibreOffice outputs to <outdir>/<basename>.pdf
                pdf_name = Path(file_path).stem + ".pdf"
                pdf_path = os.path.join(outdir, pdf_name)
                if os.path.exists(pdf_path):
                    return pdf_path
        except FileNotFoundError:
            logger.debug("LibreOffice not installed — skipping PDF conversion")
        except subprocess.TimeoutExpired:
            logger.warning("LibreOffice conversion timed out for %s", file_path)
        except Exception as e:
            logger.debug("PDF conversion failed: %s", e)
        return None

    def _estimate_page_count(self, text: str) -> int:
        """Rough page estimate: ~3000 chars per page."""
        if not text:
            return 0
        return max(1, len(text) // 3000)
