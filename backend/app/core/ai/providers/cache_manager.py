"""
Context Cache Manager - Manages Gemini context caches for SYNAPSE

Provides:
- Per-document caching for repeated document queries
- Per-user system instruction caching
- Automatic cache lifecycle management

Cost optimization: Caching reduces API costs by 75% for cached tokens.
"""

from typing import Dict, Any, Optional, List
from datetime import datetime, timezone, timedelta
import structlog
from app.core.ai.providers.gemini import GeminiProvider

logger = structlog.get_logger(__name__)


class CacheEntry:
    """Represents a cached content entry with metadata."""

    def __init__(
        self,
        cache_name: str,
        display_name: str,
        model: str,
        created_at: datetime,
        expires_at: datetime,
        cache_type: str,  # "document", "user_instructions", "session"
        owner_id: Optional[int] = None,
        document_id: Optional[str] = None,
    ):
        self.cache_name = cache_name
        self.display_name = display_name
        self.model = model
        self.created_at = created_at
        self.expires_at = expires_at
        self.cache_type = cache_type
        self.owner_id = owner_id
        self.document_id = document_id

    @property
    def is_expired(self) -> bool:
        return datetime.now(timezone.utc) > self.expires_at

    def to_dict(self) -> Dict[str, Any]:
        return {
            "cache_name": self.cache_name,
            "display_name": self.display_name,
            "model": self.model,
            "created_at": self.created_at.isoformat(),
            "expires_at": self.expires_at.isoformat(),
            "cache_type": self.cache_type,
            "owner_id": self.owner_id,
            "document_id": self.document_id,
            "is_expired": self.is_expired,
        }


class ContextCacheManager:
    """
    Manages context caches for optimized document and instruction caching.

    Cache Types:
    - document: Large document content for repeated queries
    - user_instructions: Per-user system instructions with preferences
    - session: Session-specific context (chat history + current task)

    Usage:
        manager = ContextCacheManager()

        # Cache a document
        cache_name = await manager.cache_document(
            user_id=1,
            document_id="doc_123",
            content=document_text,
            title="Biology Textbook Ch.3"
        )

        # Query using cache
        response = await manager.query_cached_document(
            cache_name=cache_name,
            query="What is photosynthesis?"
        )
    """

    # Default TTLs by cache type
    DEFAULT_TTLS = {
        "document": 3600,  # 1 hour for documents
        "user_instructions": 7200,  # 2 hours for user context
        "session": 1800,  # 30 mins for sessions
    }

    # Model for caching (must be versioned)
    CACHE_MODEL = "gemini-2.0-flash-001"

    def __init__(self, provider: Optional[GeminiProvider] = None):
        """
        Initialize cache manager.

        Args:
            provider: Optional GeminiProvider instance (creates one if not provided)
        """
        self.provider = provider or GeminiProvider()
        self.logger = logger.bind(component="cache_manager")

        # In-memory cache registry (for quick lookups)
        self._cache_registry: Dict[str, CacheEntry] = {}

    # =========================================================================
    # DOCUMENT CACHING
    # =========================================================================

    async def cache_document(
        self,
        user_id: int,
        document_id: str,
        content: str,
        title: str,
        ttl_seconds: Optional[int] = None,
        system_instruction: Optional[str] = None,
    ) -> str:
        """
        Cache a document for repeated queries.

        Args:
            user_id: Owner user ID
            document_id: Unique document identifier
            content: Document text content
            title: Human-readable title
            ttl_seconds: Custom TTL (default: 1 hour)
            system_instruction: Optional analysis instructions

        Returns:
            Cache resource name for use in queries
        """
        ttl = ttl_seconds or self.DEFAULT_TTLS["document"]
        display_name = f"doc_{document_id}_{user_id}"

        # Check if already cached
        existing = self._find_cache(document_id=document_id, user_id=user_id)
        if existing and not existing.is_expired:
            self.logger.info(
                "document_cache_hit", document_id=document_id, cache_name=existing.cache_name
            )
            return existing.cache_name

        # Build system instruction
        default_instruction = f"""You are analyzing the document: "{title}"

Your role:
- Answer questions based ONLY on this document
- Cite specific sections when possible
- If information is not in the document, say so
- Help the student understand the content deeply"""

        instruction = system_instruction or default_instruction

        # Create cache
        cache_name = await self.provider.create_context_cache(
            display_name=display_name,
            contents=content,
            model=self.CACHE_MODEL,
            system_instruction=instruction,
            ttl_seconds=ttl,
        )

        # Register in memory
        now = datetime.now(timezone.utc)
        entry = CacheEntry(
            cache_name=cache_name,
            display_name=display_name,
            model=self.CACHE_MODEL,
            created_at=now,
            expires_at=now + timedelta(seconds=ttl),
            cache_type="document",
            owner_id=user_id,
            document_id=document_id,
        )
        self._cache_registry[cache_name] = entry

        self.logger.info(
            "document_cached",
            document_id=document_id,
            user_id=user_id,
            cache_name=cache_name,
            ttl=ttl,
        )

        return cache_name

    async def query_cached_document(
        self,
        cache_name: str,
        query: str,
        temperature: float = 0.0,
    ) -> Dict[str, Any]:
        """
        Query a cached document.

        Args:
            cache_name: Cache resource name from cache_document
            query: User's question
            temperature: Generation temperature

        Returns:
            Dict with text, usage (including cached_tokens)
        """
        from app.core.ai.providers.base import GenerationConfig

        config = GenerationConfig(temperature=temperature)
        response = await self.provider.generate_with_cache(
            cache_name=cache_name,
            prompt=query,
            config=config,
        )

        return {
            "text": response.text,
            "usage": response.usage,
            "cache_name": cache_name,
            "cached_tokens": response.usage.get("cached_tokens", 0),
        }

    # =========================================================================
    # USER INSTRUCTION CACHING
    # =========================================================================

    async def cache_user_instructions(
        self,
        user_id: int,
        system_instruction: str,
        user_context: Optional[Dict[str, Any]] = None,
        ttl_seconds: Optional[int] = None,
    ) -> str:
        """
        Cache per-user system instructions and context.

        Perfect for repeated tutoring sessions where user preferences,
        mastery levels, and learning style remain constant.

        Args:
            user_id: User ID
            system_instruction: Base system prompt
            user_context: Optional user context (mastery, preferences, etc.)
            ttl_seconds: Custom TTL (default: 2 hours)

        Returns:
            Cache resource name
        """
        ttl = ttl_seconds or self.DEFAULT_TTLS["user_instructions"]
        display_name = f"user_{user_id}_instructions"

        # Check for existing cache
        existing = self._find_cache(cache_type="user_instructions", user_id=user_id)
        if existing and not existing.is_expired:
            self.logger.debug(
                "user_instruction_cache_hit", user_id=user_id, cache_name=existing.cache_name
            )
            return existing.cache_name

        # Build full instruction with context
        full_instruction = system_instruction
        if user_context:
            context_str = self._format_user_context(user_context)
            full_instruction = f"{system_instruction}\n\n{context_str}"

        # Create cache (just instructions, no content)
        cache_name = await self.provider.create_context_cache(
            display_name=display_name,
            contents=[],  # Empty content, just caching instructions
            model=self.CACHE_MODEL,
            system_instruction=full_instruction,
            ttl_seconds=ttl,
        )

        # Register
        now = datetime.now(timezone.utc)
        entry = CacheEntry(
            cache_name=cache_name,
            display_name=display_name,
            model=self.CACHE_MODEL,
            created_at=now,
            expires_at=now + timedelta(seconds=ttl),
            cache_type="user_instructions",
            owner_id=user_id,
        )
        self._cache_registry[cache_name] = entry

        self.logger.info(
            "user_instructions_cached",
            user_id=user_id,
            cache_name=cache_name,
        )

        return cache_name

    def _format_user_context(self, context: Dict[str, Any]) -> str:
        """Format user context for inclusion in system prompt."""
        parts = ["**User Learning Context:**"]

        if "weak_areas" in context:
            parts.append(f"- Weak areas: {', '.join(context['weak_areas'])}")

        if "mastery_scores" in context:
            scores = context["mastery_scores"]
            parts.append(f"- Mastery levels: {scores}")

        if "preferences" in context:
            parts.append(f"- Learning preferences: {context['preferences']}")

        if "recent_topics" in context:
            parts.append(f"- Recent topics: {', '.join(context['recent_topics'][:5])}")

        return "\n".join(parts)

    # =========================================================================
    # CACHE MANAGEMENT
    # =========================================================================

    def _find_cache(
        self,
        document_id: Optional[str] = None,
        user_id: Optional[int] = None,
        cache_type: Optional[str] = None,
    ) -> Optional[CacheEntry]:
        """Find a cache by criteria."""
        for entry in self._cache_registry.values():
            if document_id and entry.document_id != document_id:
                continue
            if user_id and entry.owner_id != user_id:
                continue
            if cache_type and entry.cache_type != cache_type:
                continue
            return entry
        return None

    async def invalidate_document_cache(self, document_id: str) -> bool:
        """Invalidate cache when document is updated."""
        entry = self._find_cache(document_id=document_id)
        if entry:
            await self.provider.delete_cache(entry.cache_name)
            del self._cache_registry[entry.cache_name]
            self.logger.info("document_cache_invalidated", document_id=document_id)
            return True
        return False

    async def extend_cache(self, cache_name: str, additional_seconds: int = 3600) -> bool:
        """Extend cache TTL."""
        entry = self._cache_registry.get(cache_name)
        if entry:
            success = await self.provider.update_cache_ttl(cache_name, additional_seconds)
            if success:
                entry.expires_at = datetime.now(timezone.utc) + timedelta(
                    seconds=additional_seconds
                )
            return success
        return False

    async def cleanup_expired(self) -> int:
        """Remove expired caches from registry and API."""
        expired = [name for name, entry in self._cache_registry.items() if entry.is_expired]

        for name in expired:
            try:
                await self.provider.delete_cache(name)
            except Exception:
                pass  # May already be deleted
            del self._cache_registry[name]

        if expired:
            self.logger.info("expired_caches_cleaned", count=len(expired))

        return len(expired)

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        by_type = {}
        for entry in self._cache_registry.values():
            by_type[entry.cache_type] = by_type.get(entry.cache_type, 0) + 1

        return {
            "total_caches": len(self._cache_registry),
            "by_type": by_type,
            "expired": sum(1 for e in self._cache_registry.values() if e.is_expired),
        }

    async def list_user_caches(self, user_id: int) -> List[Dict[str, Any]]:
        """List all caches for a user."""
        return [
            entry.to_dict() for entry in self._cache_registry.values() if entry.owner_id == user_id
        ]


# Global instance
_cache_manager: Optional[ContextCacheManager] = None


def get_cache_manager() -> ContextCacheManager:
    """Get global cache manager instance."""
    global _cache_manager
    if _cache_manager is None:
        _cache_manager = ContextCacheManager()
    return _cache_manager
