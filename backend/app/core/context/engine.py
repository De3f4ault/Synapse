"""
Context Engine

Main context aggregator - the SYNAPSE BRAIN.
Aggregates learning context from all modules and SQL functions.
"""

import time
import json
from typing import Dict, Any, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from .schemas import ContextRequest, ContextResponse, WeakArea, MasteryScore
from .sql_executor import SQLExecutor
from .priority_manager import PriorityManager

logger = structlog.get_logger(__name__)


class ContextEngine:
    """
    Central context aggregation engine for SYNAPSE.

    This is the "brain" that gathers all relevant user learning context:
    - Weak areas from SQL functions
    - Mastery scores per topic
    - Recent activity from all modules
    - Due study items
    - User preferences

    The context is used by AI agents to provide personalized assistance.
    """

    # Cache TTL in seconds
    CACHE_TTL = 300  # 5 minutes

    def __init__(
        self,
        session: AsyncSession,
        cache_client: Any = None,  # Redis client
        module_registry: Any = None  # Module registry
    ):
        """
        Initialize context engine

        Args:
            session: Database session
            cache_client: Optional Redis client for caching
            module_registry: Optional module registry for querying modules
        """
        self.session = session
        self.cache_client = cache_client
        self.module_registry = module_registry
        self.sql_executor = SQLExecutor(session)
        self.priority_manager = PriorityManager()

    async def get_user_context(
        self,
        user_id: int,
        focus: Optional[str] = None,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        Get complete user learning context

        Args:
            user_id: User ID
            focus: Optional focus topic to prioritize
            use_cache: Whether to use cached context

        Returns:
            Complete context dict
        """
        start_time = time.time()

        logger.info(
            "building_user_context",
            user_id=user_id,
            focus=focus,
            use_cache=use_cache
        )

        # Check cache
        if use_cache and self.cache_client:
            cached = await self._get_from_cache(user_id)
            if cached:
                logger.info(
                    "context_cache_hit",
                    user_id=user_id,
                    elapsed_ms=int((time.time() - start_time) * 1000)
                )
                return cached

        # Build context from scratch
        context = await self._build_context(user_id, focus)

        # Cache the result
        if self.cache_client:
            await self._save_to_cache(user_id, context)

        elapsed_ms = int((time.time() - start_time) * 1000)

        logger.info(
            "context_built",
            user_id=user_id,
            elapsed_ms=elapsed_ms,
            cached=False
        )

        # Add metadata
        context["metadata"] = {
            "cached": False,
            "generation_time_ms": elapsed_ms,
            "focus": focus
        }
        context["generated_at"] = datetime.utcnow().isoformat()

        return context

    async def _build_context(
        self,
        user_id: int,
        focus: Optional[str]
    ) -> Dict[str, Any]:
        """
        Build context from SQL functions and modules

        Args:
            user_id: User ID
            focus: Optional focus topic

        Returns:
            Context dict
        """
        context = {
            "user_id": user_id,
            "modules": {},
            "analytics": {}
        }

        # 1. Get SQL function context (fast, prioritized)
        try:
            sql_context = await self.sql_executor.call_build_user_context(user_id)
            if sql_context:
                context["analytics"].update(sql_context)
        except Exception as e:
            logger.error(
                "failed_to_get_sql_context",
                user_id=user_id,
                error=str(e),
                exc_info=True
            )

        # 2. Get weak areas
        try:
            weak_areas = await self.sql_executor.call_detect_weak_areas(user_id)
            context["analytics"]["weak_topics"] = [
                WeakArea(
                    topic=area.get("topic", ""),
                    module=area.get("module", "unknown"),
                    weakness_score=area.get("weakness_score", 0.0),
                    evidence=area.get("evidence", {})
                ).dict()
                for area in weak_areas
            ] if weak_areas else []
        except Exception as e:
            logger.error(
                "failed_to_get_weak_areas",
                user_id=user_id,
                error=str(e),
                exc_info=True
            )
            context["analytics"]["weak_topics"] = []

        # 3. Get mastery scores
        try:
            mastery = await self.sql_executor.call_calculate_mastery(user_id)
            context["analytics"]["mastery_scores"] = [
                MasteryScore(
                    topic=topic,
                    score=score,
                    review_count=0  # Will be populated by SQL function
                ).dict()
                for topic, score in mastery.items()
            ] if mastery else []
        except Exception as e:
            logger.error(
                "failed_to_get_mastery",
                user_id=user_id,
                error=str(e),
                exc_info=True
            )
            context["analytics"]["mastery_scores"] = []

        # 4. Get module-specific context
        if self.module_registry:
            try:
                await self._add_module_context(context, user_id, focus)
            except Exception as e:
                logger.error(
                    "failed_to_get_module_context",
                    user_id=user_id,
                    error=str(e),
                    exc_info=True
                )

        return context

    async def _add_module_context(
        self,
        context: Dict[str, Any],
        user_id: int,
        focus: Optional[str]
    ):
        """
        Add context from registered modules

        Args:
            context: Context dict to update
            user_id: User ID
            focus: Optional focus topic
        """
        # Get all registered modules
        modules = self.module_registry.get_all_modules()

        for module in modules:
            try:
                # Call module's contribute_context method
                module_context = await module.contribute_context(user_id, focus)

                if module_context:
                    context["modules"][module.get_name()] = module_context

                    logger.debug(
                        "module_context_added",
                        module=module.get_name(),
                        user_id=user_id
                    )
            except Exception as e:
                logger.error(
                    "module_context_failed",
                    module=module.get_name(),
                    user_id=user_id,
                    error=str(e),
                    exc_info=True
                )

    async def invalidate_cache(self, user_id: int):
        """
        Invalidate cached context for a user

        Args:
            user_id: User ID
        """
        if not self.cache_client:
            return

        cache_key = self._get_cache_key(user_id)

        try:
            await self.cache_client.delete(cache_key)
            logger.info("context_cache_invalidated", user_id=user_id)
        except Exception as e:
            logger.error(
                "cache_invalidation_failed",
                user_id=user_id,
                error=str(e),
                exc_info=True
            )

    async def _get_from_cache(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get context from cache"""
        cache_key = self._get_cache_key(user_id)

        try:
            cached_str = await self.cache_client.get(cache_key)
            if cached_str:
                return json.loads(cached_str)
        except Exception as e:
            logger.error(
                "cache_read_failed",
                user_id=user_id,
                error=str(e),
                exc_info=True
            )

        return None

    async def _save_to_cache(self, user_id: int, context: Dict[str, Any]):
        """Save context to cache"""
        cache_key = self._get_cache_key(user_id)

        try:
            context_str = json.dumps(context)
            await self.cache_client.setex(
                cache_key,
                self.CACHE_TTL,
                context_str
            )
        except Exception as e:
            logger.error(
                "cache_write_failed",
                user_id=user_id,
                error=str(e),
                exc_info=True
            )

    def _get_cache_key(self, user_id: int) -> str:
        """Generate cache key for user context"""
        return f"context:{user_id}"
