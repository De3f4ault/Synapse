"""
Services layer for shared application services.

This module provides access to all shared services including:
- Analytics (PostgreSQL)
- Cache (PostgreSQL kv_store)
- Storage (Local filesystem)
- Background tasks (Celery)
- Email service
"""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .cache.client import CacheClient
    from .storage.manager import StorageManager
    from .email.sender import EmailSender

__all__ = [
    "CacheClient",
    "StorageManager",
    "EmailSender",
]
