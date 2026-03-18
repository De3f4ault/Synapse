"""
Weight-based parser registry.

Parsers register with a weight + set of MIME types. Lower weight = higher
priority. When multiple parsers handle the same MIME type, the lowest-weight
parser wins.

Sourced from Paperless-ngx parsers.py parser registry pattern.
"""

import logging
from typing import Optional, Type

from .base import BaseDocumentParser

logger = logging.getLogger(__name__)


class ParserRegistry:
    """
    Registry mapping MIME types to parser classes by priority.

    Usage:
        registry = ParserRegistry()
        registry.register(RasterizedDocumentParser, weight=0,
                          mime_types={"application/pdf", "image/jpeg"})
        parser_class = registry.get_parser_for_mime_type("application/pdf")
        parser = parser_class()
        parser.parse(file_path, mime_type, filename)
    """

    def __init__(self):
        self._registry: list[tuple[Type[BaseDocumentParser], int, set[str]]] = []

    def register(
        self,
        parser_class: Type[BaseDocumentParser],
        weight: int,
        mime_types: set[str],
    ) -> None:
        """Register a parser with weight and supported MIME types."""
        self._registry.append((parser_class, weight, mime_types))
        self._registry.sort(key=lambda x: x[1])  # Keep sorted by weight (lowest first)
        logger.info(
            "Registered %s (weight=%d, types=%d)",
            parser_class.__name__, weight, len(mime_types),
        )

    def get_parser_for_mime_type(
        self, mime_type: str
    ) -> Optional[Type[BaseDocumentParser]]:
        """Return the lowest-weight parser that handles this MIME type."""
        for parser_class, _weight, mime_types in self._registry:
            if mime_type in mime_types:
                return parser_class
        return None

    def get_supported_mime_types(self) -> set[str]:
        """Return all registered MIME types across all parsers."""
        all_types: set[str] = set()
        for _, _, mime_types in self._registry:
            all_types |= mime_types
        return all_types

    def get_all_parsers(self) -> list[tuple[Type[BaseDocumentParser], int, set[str]]]:
        """Return all registered parsers (for introspection)."""
        return list(self._registry)


# ---------------------------------------------------------------------------
# Global singleton
# ---------------------------------------------------------------------------

_registry = ParserRegistry()


def get_parser_registry() -> ParserRegistry:
    """Return the global parser registry."""
    return _registry


def get_parser_for_mime_type(mime_type: str) -> Optional[Type[BaseDocumentParser]]:
    """Convenience: look up a parser class by MIME type from the global registry."""
    return _registry.get_parser_for_mime_type(mime_type)
