"""Document ingestion package initialization."""

from app.core.ai.rag.ingestion.parsers.pdf_parser import PDFParser
from app.core.ai.rag.ingestion.parsers.base_parser import BaseParser

__all__ = [
    "PDFParser",
    "BaseParser",
]
