"""
Cache invalidation strategies and utilities.

Handles cache invalidation on data updates, deletions,
and provides strategies for maintaining cache consistency.

All methods are async to match the PgCacheClient interface.
"""

import logging
from typing import Optional, Set, List
from enum import Enum

from .pg_cache import PgCacheClient

logger = logging.getLogger(__name__)


class InvalidationStrategy(Enum):
    """Cache invalidation strategies."""

    IMMEDIATE = "immediate"  # Invalidate immediately
    LAZY = "lazy"  # Invalidate on next access
    TTL = "ttl"  # Let TTL expire naturally
    TAG_BASED = "tag_based"  # Invalidate by tags


class CacheInvalidator:
    """
    Manages cache invalidation for data consistency.

    Provides strategies for invalidating related cache entries
    when data changes in the system. All methods are async.
    """

    def __init__(self, client: PgCacheClient, key_prefix: str = "app"):
        """
        Initialize cache invalidator.

        Args:
            client: PgCacheClient instance
            key_prefix: Cache key prefix
        """
        self.client = client
        self.key_prefix = key_prefix
        logger.debug(f"Initialized CacheInvalidator (prefix={key_prefix})")

    def make_key(self, *parts: str) -> str:
        """Generate cache key."""
        return f"{self.key_prefix}:{':'.join(str(p) for p in parts)}"

    async def invalidate_user_cache(self, user_id: str) -> int:
        """
        Invalidate all cache entries for a user.

        Args:
            user_id: User ID

        Returns:
            int: Number of keys invalidated
        """
        pattern = self.make_key("user", user_id, "*")
        keys = await self.client.keys(pattern)

        if keys:
            count = await self.client.delete(*keys)
            logger.info(f"Invalidated {count} cache keys for user {user_id}")
            return count

        return 0

    async def invalidate_document_cache(self, document_id: str) -> int:
        """
        Invalidate cache entries related to a document.

        Args:
            document_id: Document ID

        Returns:
            int: Number of keys invalidated
        """
        patterns = [
            self.make_key("document", document_id, "*"),
            self.make_key("query", "*", document_id),
        ]

        total_invalidated = 0
        for pattern in patterns:
            keys = await self.client.keys(pattern)
            if keys:
                total_invalidated += await self.client.delete(*keys)

        logger.info(f"Invalidated {total_invalidated} cache keys for document {document_id}")
        return total_invalidated

    async def invalidate_query_cache(
        self, query_hash: Optional[str] = None, user_id: Optional[str] = None
    ) -> int:
        """
        Invalidate query result caches.

        Args:
            query_hash: Specific query hash (optional)
            user_id: User ID to invalidate all their queries (optional)

        Returns:
            int: Number of keys invalidated
        """
        if query_hash:
            key = self.make_key("query", query_hash)
            return await self.client.delete(key)

        if user_id:
            pattern = self.make_key("query", "*", user_id)
            keys = await self.client.keys(pattern)
            if keys:
                return await self.client.delete(*keys)

        # Invalidate all query caches
        pattern = self.make_key("query", "*")
        keys = await self.client.keys(pattern)
        if keys:
            count = await self.client.delete(*keys)
            logger.warning(f"Invalidated ALL query caches: {count} keys")
            return count

        return 0

    async def invalidate_by_tags(self, tags: Set[str]) -> int:
        """
        Invalidate cache entries by tags.

        Args:
            tags: Set of tags to invalidate

        Returns:
            int: Number of keys invalidated
        """
        total_invalidated = 0

        for tag in tags:
            # Get keys associated with tag
            tag_key = self.make_key("tag", tag)
            tagged_keys = await self.client.get(tag_key, default=set())

            if tagged_keys:
                # Delete tagged keys
                if isinstance(tagged_keys, str):
                    tagged_keys = {tagged_keys}

                count = await self.client.delete(*tagged_keys)
                total_invalidated += count

                # Delete tag key itself
                await self.client.delete(tag_key)

        logger.info(f"Invalidated {total_invalidated} keys by tags: {tags}")
        return total_invalidated

    async def add_tag_to_key(self, key: str, tag: str) -> bool:
        """
        Associate a tag with a cache key.

        Args:
            key: Cache key
            tag: Tag identifier

        Returns:
            bool: True if successful
        """
        tag_key = self.make_key("tag", tag)

        # Get existing tagged keys
        tagged_keys = await self.client.get(tag_key, default=set())

        if isinstance(tagged_keys, str):
            tagged_keys = {tagged_keys}
        elif not isinstance(tagged_keys, set):
            tagged_keys = set()

        # Add new key
        tagged_keys.add(key)

        # Store updated tag
        return await self.client.set(tag_key, list(tagged_keys))

    async def invalidate_on_update(
        self, entity_type: str, entity_id: str, related_entities: Optional[List[tuple]] = None
    ) -> int:
        """
        Invalidate cache on entity update.

        Args:
            entity_type: Type of entity (e.g., 'user', 'document')
            entity_id: Entity ID
            related_entities: List of (type, id) tuples for related entities

        Returns:
            int: Total keys invalidated
        """
        total_invalidated = 0

        # Invalidate main entity cache
        pattern = self.make_key(entity_type, entity_id, "*")
        keys = await self.client.keys(pattern)
        if keys:
            total_invalidated += await self.client.delete(*keys)

        # Invalidate related entities
        if related_entities:
            for rel_type, rel_id in related_entities:
                pattern = self.make_key(rel_type, rel_id, "*")
                keys = await self.client.keys(pattern)
                if keys:
                    total_invalidated += await self.client.delete(*keys)

        logger.info(f"Invalidated {total_invalidated} keys for {entity_type}:{entity_id}")
        return total_invalidated

    async def invalidate_on_delete(self, entity_type: str, entity_id: str) -> int:
        """
        Invalidate cache on entity deletion.

        More aggressive invalidation including aggregations.

        Args:
            entity_type: Type of entity
            entity_id: Entity ID

        Returns:
            int: Total keys invalidated
        """
        patterns = [
            self.make_key(entity_type, entity_id, "*"),
            self.make_key("agg", entity_type, "*"),  # Aggregations
            self.make_key("list", entity_type, "*"),  # Lists
        ]

        total_invalidated = 0
        for pattern in patterns:
            keys = await self.client.keys(pattern)
            if keys:
                total_invalidated += await self.client.delete(*keys)

        logger.info(
            f"Invalidated {total_invalidated} keys on deletion of {entity_type}:{entity_id}"
        )
        return total_invalidated

    async def smart_invalidation(
        self, changed_fields: Set[str], entity_type: str, entity_id: str
    ) -> int:
        """
        Selectively invalidate based on changed fields.

        Only invalidates caches that depend on changed fields.

        Args:
            changed_fields: Set of field names that changed
            entity_type: Type of entity
            entity_id: Entity ID

        Returns:
            int: Keys invalidated
        """
        # Map fields to cache patterns
        field_patterns = {
            "name": ["profile", "display"],
            "email": ["contact", "profile"],
            "preferences": ["settings", "config"],
            "content": ["document", "search"],
        }

        patterns_to_invalidate = set()
        for field in changed_fields:
            if field in field_patterns:
                patterns_to_invalidate.update(field_patterns[field])

        # Invalidate affected caches
        total_invalidated = 0
        for pattern in patterns_to_invalidate:
            cache_pattern = self.make_key(entity_type, entity_id, pattern, "*")
            keys = await self.client.keys(cache_pattern)
            if keys:
                total_invalidated += await self.client.delete(*keys)

        logger.info(f"Smart invalidation: {total_invalidated} keys for fields {changed_fields}")
        return total_invalidated

    async def schedule_invalidation(self, key: str, delay_seconds: int) -> bool:
        """
        Schedule delayed cache invalidation.

        Args:
            key: Cache key to invalidate
            delay_seconds: Delay before invalidation

        Returns:
            bool: True if scheduled successfully
        """
        # Set a very short TTL to simulate scheduled deletion
        return await self.client.expire(key, delay_seconds)

    async def get_invalidation_stats(self) -> dict:
        """
        Get statistics about cache invalidations.

        Returns:
            dict: Invalidation statistics
        """
        patterns = [
            ("user", self.make_key("user", "*")),
            ("document", self.make_key("document", "*")),
            ("query", self.make_key("query", "*")),
        ]

        stats = {}
        for name, pattern in patterns:
            keys = await self.client.keys(pattern)
            stats[f"{name}_cached"] = len(keys)

        return stats
