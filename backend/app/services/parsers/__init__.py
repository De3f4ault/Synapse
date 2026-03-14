"""
Parser module — unified document text extraction for Synapse.

Provides a weight-based parser registry that maps MIME types to
parser implementations. All 4 parsers are auto-registered on import.

Usage:
    from app.services.parsers import get_parser_for_mime_type

    parser_class = get_parser_for_mime_type("application/pdf")
    if parser_class:
        parser = parser_class()
        parser.parse(file_path, "application/pdf", "invoice.pdf")
        text = parser.get_text()
        archive = parser.get_archive_path()
        parser.cleanup()
"""

from .base import BaseDocumentParser
from .registry import (
    ParserRegistry,
    get_parser_registry,
    get_parser_for_mime_type,
)

# ---------------------------------------------------------------------------
# Auto-register all parsers on import
# ---------------------------------------------------------------------------
from .rasterized import RasterizedDocumentParser, SUPPORTED_MIME_TYPES as _rast_types, WEIGHT as _rast_w
from .office import OfficeDocumentParser, SUPPORTED_MIME_TYPES as _off_types, WEIGHT as _off_w
from .text import TextDocumentParser, SUPPORTED_MIME_TYPES as _txt_types, WEIGHT as _txt_w
from .epub import EpubDocumentParser, SUPPORTED_MIME_TYPES as _epub_types, WEIGHT as _epub_w

_registry = get_parser_registry()
_registry.register(RasterizedDocumentParser, _rast_w, _rast_types)
_registry.register(OfficeDocumentParser, _off_w, _off_types)
_registry.register(TextDocumentParser, _txt_w, _txt_types)
_registry.register(EpubDocumentParser, _epub_w, _epub_types)

__all__ = [
    "BaseDocumentParser",
    "ParserRegistry",
    "get_parser_registry",
    "get_parser_for_mime_type",
    "RasterizedDocumentParser",
    "OfficeDocumentParser",
    "TextDocumentParser",
    "EpubDocumentParser",
]
