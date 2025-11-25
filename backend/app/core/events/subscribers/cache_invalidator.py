"""
Cache Invalidation Subscriber

Invalidates caches when content changes.
"""

from typing import List
import structlog

from .base import BaseSubscriber
from ..triggers import Event, EventType

logger = structlog.get_logger(__name__)


class CacheInvalidationSubscriber(BaseSubscriber):
    """
    Subscriber that invalidates relevant caches when content changes.

    This ensures that stale data is not served after updates.
    """

    def __init__(self, cache_client=None):
        """
        Initialize cache invalidation subscriber

        Args:
            cache_client: Redis client for cache operations
        """
        super().__init__()
        self.cache_client = cache_client

    def get_subscribed_events(self) -> List[EventType]:
        """Events that trigger cache invalidation"""
        return [
            # Flashcard events
            EventType.CARD_CREATED,
            EventType.CARD_UPDATED,
            EventType.CARD_REVIEWED,
            EventType.CARD_DELETED,
            EventType.DECK_UPDATED,
            EventType.DECK_DELETED,

            # Note events
            EventType.NOTE_CREATED,
            EventType.NOTE_UPDATED,
            EventType.NOTE_DELETED,

            # Document events
            EventType.DOCUMENT_PROCESSED,
            EventType.DOCUMENT_DELETED,

            # Quiz events
            EventType.QUIZ_COMPLETED,

            # Study events
            EventType.STUDY_SESSION_COMPLETED,
        ]

    async def on_event(self, event: Event):
        """
        Invalidate caches based on event type and data

        Args:
            event: Event triggering cache invalidation
        """
        if not self.cache_client:
            logger.debug("no_cache_client_skipping_invalidation")
            return

        if not event.user_id:
            logger.debug("no_user_id_skipping_cache_invalidation")
            return

        # Always invalidate user context cache
        await self._invalidate_user_context(event.user_id)

        # Event-specific invalidations
        if event.type in [
            EventType.CARD_UPDATED,
            EventType.CARD_REVIEWED,
            EventType.CARD_DELETED
        ]:
            await self._invalidate_flashcard_caches(event)

        elif event.type in [EventType.NOTE_UPDATED, EventType.NOTE_DELETED]:
            await self._invalidate_note_caches(event)

        elif event.type in [EventType.DOCUMENT_PROCESSED, EventType.DOCUMENT_DELETED]:
            await self._invalidate_document_caches(event)

        elif event.type == EventType.STUDY_SESSION_COMPLETED:
            await self._invalidate_study_caches(event)

        logger.info(
            "cache_invalidated",
            event_type=event.type.value,
            user_id=event.user_id
        )

    async def _invalidate_user_context(self, user_id: int):
        """Invalidate user context cache"""
        try:
            cache_key = f"context:{user_id}"
            await self.cache_client.delete(cache_key)

            logger.debug(
                "invalidated_user_context",
                user_id=user_id,
                cache_key=cache_key
            )
        except Exception as e:
            logger.error(
                "failed_to_invalidate_user_context",
                user_id=user_id,
                error=str(e)
            )

    async def _invalidate_flashcard_caches(self, event: Event):
        """Invalidate flashcard-related caches"""
        try:
            # Invalidate deck statistics cache
            deck_id = event.data.get("deck_id")
            if deck_id:
                cache_key = f"deck:{deck_id}:stats"
                await self.cache_client.delete(cache_key)

                logger.debug(
                    "invalidated_deck_stats",
                    deck_id=deck_id,
                    cache_key=cache_key
                )

            # Invalidate due cards cache
            user_cache_key = f"due_cards:{event.user_id}"
            await self.cache_client.delete(user_cache_key)

        except Exception as e:
            logger.error(
                "failed_to_invalidate_flashcard_caches",
                event_type=event.type.value,
                error=str(e)
            )

    async def _invalidate_note_caches(self, event: Event):
        """Invalidate note-related caches"""
        try:
            # Invalidate note search cache for this user
            # Use pattern matching to delete all search caches
            pattern = f"search:notes:{event.user_id}:*"

            # Note: SCAN pattern matching requires cursor iteration
            cursor = 0
            while True:
                cursor, keys = await self.cache_client.scan(
                    cursor,
                    match=pattern,
                    count=100
                )

                if keys:
                    await self.cache_client.delete(*keys)

                if cursor == 0:
                    break

            logger.debug(
                "invalidated_note_caches",
                user_id=event.user_id,
                pattern=pattern
            )

        except Exception as e:
            logger.error(
                "failed_to_invalidate_note_caches",
                event_type=event.type.value,
                error=str(e)
            )

    async def _invalidate_document_caches(self, event: Event):
        """Invalidate document-related caches"""
        try:
            document_id = event.data.get("document_id")

            if document_id:
                # Invalidate document cache
                cache_key = f"document:{document_id}"
                await self.cache_client.delete(cache_key)

                # Invalidate RAG query caches involving this document
                pattern = f"rag:*:doc:{document_id}:*"
                cursor = 0
                while True:
                    cursor, keys = await self.cache_client.scan(
                        cursor,
                        match=pattern,
                        count=100
                    )

                    if keys:
                        await self.cache_client.delete(*keys)

                    if cursor == 0:
                        break

            logger.debug(
                "invalidated_document_caches",
                document_id=document_id
            )

        except Exception as e:
            logger.error(
                "failed_to_invalidate_document_caches",
                event_type=event.type.value,
                error=str(e)
            )

    async def _invalidate_study_caches(self, event: Event):
        """Invalidate study-related caches"""
        try:
            # Invalidate study recommendations cache
            cache_key = f"study:recommendations:{event.user_id}"
            await self.cache_client.delete(cache_key)

            # Invalidate performance analytics cache
            analytics_key = f"analytics:performance:{event.user_id}"
            await self.cache_client.delete(analytics_key)

            logger.debug(
                "invalidated_study_caches",
                user_id=event.user_id
            )

        except Exception as e:
            logger.error(
                "failed_to_invalidate_study_caches",
                event_type=event.type.value,
                error=str(e)
            )
