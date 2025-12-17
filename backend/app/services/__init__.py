"""
Services layer for shared application services.

This module provides access to all shared services including:
- Vector store (Qdrant)
- Analytics (DuckDB)
- Cache (Redis)
- Storage (Local filesystem)
- Background tasks (Celery)
- Email service
"""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .vector_store.client import VectorStoreClient
    from .analytics.client import AnalyticsClient
    from .cache.client import CacheClient
    from .storage.manager import StorageManager
    from .background.worker import BackgroundWorker
    from .email.sender import EmailSender

__all__ = [
    "VectorStoreClient",
    "AnalyticsClient",
    "CacheClient",
    "StorageManager",
    "BackgroundWorker",
    "EmailSender",
]
