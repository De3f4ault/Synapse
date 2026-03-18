"""
Ingestion pipeline — plugin base class.

All ingestion plugins implement this ABC.

Sourced from Paperless-ngx plugins/base.py concept.
"""

import abc
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.services.ingestion.pipeline import IngestDocument


class IngestionPlugin(abc.ABC):
    """
    Abstract base class for ingestion pipeline plugins.

    Each plugin receives an IngestDocument and modifies it in place.
    To abort the pipeline, set doc.status to a non-OK value.
    """

    @abc.abstractmethod
    async def run(self, doc: "IngestDocument") -> None:
        """
        Execute this plugin's logic.

        Args:
            doc: The document being ingested (modify in place).
        """
        ...
