"""
Agent metrics counter manager using PostgreSQL.

Replaces RedisCounterManager with direct SQL operations
on the agent_metrics and kv_store tables.

This module provides a class-based interface compatible
with existing agent monitoring code.
"""

from dataclasses import dataclass, field
from typing import Dict, Optional

from app.utils.logging import get_logger

logger = get_logger(__name__)


# ── Lightweight metrics dataclass (used by monitoring __init__) ───


@dataclass
class AgentMetrics:
    """
    Lightweight container for agent performance stats.

    This is NOT the SQLAlchemy model (that's AgentMetric in models/).
    This is a plain dataclass returned by get_agent_metrics() for
    quick stats lookups without ORM overhead.
    """

    agent_name: str
    total_calls: int = 0
    success_count: int = 0
    failure_count: int = 0
    avg_duration_ms: float = 0.0
    p50_duration_ms: int = 0
    p95_duration_ms: int = 0
    total_tokens: int = 0
    models_used: Dict[str, int] = field(default_factory=dict)


class PgCounterManager:
    """
    PostgreSQL-backed agent counter manager.

    Replaces RedisCounterManager. Uses:
    - agent_metrics table for detailed per-invocation records
    - kv_store table (via PgCacheClient) for simple counters

    All methods are async.
    """

    def __init__(self):
        """Initialize the counter manager."""
        pass

    async def increment(
        self,
        key: str,
        amount: int = 1,
        ttl: Optional[int] = None,
    ) -> int:
        """
        Atomically increment a counter.

        Args:
            key: Counter key
            amount: Increment amount
            ttl: Optional TTL in seconds

        Returns:
            int: New counter value
        """
        from app.services.cache.client import get_cache

        cache = get_cache()
        new_value = await cache.increment(key, amount)

        if ttl and new_value == amount:
            await cache.expire(key, ttl)

        return new_value

    async def get(self, key: str) -> int:
        """
        Get counter value.

        Args:
            key: Counter key

        Returns:
            int: Counter value (0 if not found)
        """
        from app.services.cache.client import get_cache

        cache = get_cache()
        value = await cache.get(key, default=0)
        return int(value) if value else 0

    async def get_multiple(self, keys: list) -> Dict[str, int]:
        """
        Get multiple counter values.

        Args:
            keys: List of counter keys

        Returns:
            Dict mapping key to value
        """
        if not keys:
            return {}

        from app.services.cache.client import get_cache

        cache = get_cache()
        values = await cache.mget(*keys)

        return {key: int(val) if val else 0 for key, val in zip(keys, values)}

    async def record_invocation(
        self,
        agent_name: str,
        success: bool = True,
        duration_ms: int = 0,
        tokens_used: Optional[int] = None,
        model: Optional[str] = None,
    ) -> None:
        """
        Record an agent invocation with detailed metrics.

        Args:
            agent_name: Agent name
            success: Whether successful
            duration_ms: Duration in milliseconds
            tokens_used: Token count
            model: Model used
        """
        from app.core.realtime.metrics import record_agent_invocation

        await record_agent_invocation(
            agent_name=agent_name,
            success=success,
            duration_ms=duration_ms,
            tokens_used=tokens_used,
            model=model,
        )

    async def get_stats(
        self,
        agent_name: str,
        window_hours: int = 24,
    ) -> Dict:
        """
        Get agent stats for time window.

        Args:
            agent_name: Agent name
            window_hours: Lookback window

        Returns:
            Dict with total, success/failure counts, duration stats, tokens
        """
        from app.core.realtime.metrics import get_agent_stats

        return await get_agent_stats(agent_name, window_hours)


# Module-level singleton
_counter_manager: Optional[PgCounterManager] = None


def get_counter_manager() -> PgCounterManager:
    """Get the global counter manager instance."""
    global _counter_manager
    if _counter_manager is None:
        _counter_manager = PgCounterManager()
    return _counter_manager


# ── Convenience functions (imported by monitoring/__init__.py) ────


async def track_agent_call(
    agent_name: str,
    success: bool = True,
    duration_ms: int = 0,
    tokens_used: Optional[int] = None,
    model: Optional[str] = None,
) -> None:
    """
    Track an agent call — convenience wrapper around PgCounterManager.

    Args:
        agent_name: Agent name
        success: Whether the call succeeded
        duration_ms: Call duration in ms
        tokens_used: Tokens consumed
        model: Model name used
    """
    manager = get_counter_manager()
    await manager.record_invocation(
        agent_name=agent_name,
        success=success,
        duration_ms=duration_ms,
        tokens_used=tokens_used,
        model=model,
    )


async def get_agent_metrics(
    agent_name: str,
    window_hours: int = 24,
) -> AgentMetrics:
    """
    Get aggregated metrics for an agent.

    Returns an AgentMetrics dataclass with stats from the agent_metrics table.
    """
    manager = get_counter_manager()
    stats = await manager.get_stats(agent_name, window_hours)

    return AgentMetrics(
        agent_name=agent_name,
        total_calls=stats.get("total", 0),
        success_count=stats.get("success", 0),
        failure_count=stats.get("failures", 0),
        avg_duration_ms=stats.get("avg_duration_ms", 0.0),
        p50_duration_ms=stats.get("p50_duration_ms", 0),
        p95_duration_ms=stats.get("p95_duration_ms", 0),
        total_tokens=stats.get("total_tokens", 0),
    )


async def increment_counter(key: str, amount: int = 1, ttl: Optional[int] = None) -> int:
    """Increment a simple counter. Returns new value."""
    manager = get_counter_manager()
    return await manager.increment(key, amount, ttl)


async def get_counter(key: str) -> int:
    """Get a simple counter value."""
    manager = get_counter_manager()
    return await manager.get(key)
