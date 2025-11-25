"""
Redis Counters - Real-time agent metrics

Uses Redis INCR/DECR for sub-millisecond metrics:
- Call counts (total, success, failure)
- Response times (avg, p50, p95, p99)
- Token usage
- Model usage distribution

Why Redis?
- O(1) operations
- Sub-millisecond latency
- Atomic increments
- TTL for automatic cleanup

Based on production monitoring patterns from Datadog, New Relic.
"""

from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import structlog

logger = structlog.get_logger(__name__)


@dataclass
class AgentMetrics:
    """Agent performance metrics"""
    agent_name: str
    period: str  # "minute", "hour", "day"

    # Call metrics
    total_calls: int = 0
    successful_calls: int = 0
    failed_calls: int = 0

    # Performance metrics
    avg_execution_time_ms: float = 0.0
    p95_execution_time_ms: float = 0.0
    p99_execution_time_ms: float = 0.0

    # Resource metrics
    total_tokens: int = 0
    avg_tokens_per_call: float = 0.0

    # Model distribution
    model_usage: Dict[str, int] = None

    # Derived metrics
    @property
    def success_rate(self) -> float:
        """Calculate success rate"""
        if self.total_calls == 0:
            return 0.0
        return self.successful_calls / self.total_calls

    @property
    def failure_rate(self) -> float:
        """Calculate failure rate"""
        return 1.0 - self.success_rate

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dict"""
        data = asdict(self)
        data["success_rate"] = self.success_rate
        data["failure_rate"] = self.failure_rate
        return data


class RedisCounterManager:
    """
    Manage Redis counters for agent monitoring

    Key patterns:
    - agent:{name}:calls:total:{period}
    - agent:{name}:calls:success:{period}
    - agent:{name}:calls:failure:{period}
    - agent:{name}:time:total:{period}
    - agent:{name}:tokens:total:{period}
    """

    def __init__(self, redis_client: Optional[Any] = None):
        """
        Initialize counter manager

        Args:
            redis_client: Redis client (injected)
        """
        self.redis = redis_client
        self.logger = logger.bind(component="redis_counters")

    def _get_redis(self) -> Any:
        """Get Redis client (lazy)"""
        if self.redis is None:
            from app.services.cache.client import get_redis
            self.redis = get_redis()
        return self.redis

    def _get_period_key(self, period: str = "hour") -> str:
        """
        Get period-specific key suffix

        Args:
            period: "minute", "hour", or "day"

        Returns:
            Period key (e.g., "2025-11-20:15:00" for hour)
        """
        now = datetime.utcnow()

        if period == "minute":
            return now.strftime("%Y-%m-%d:%H:%M")
        elif period == "hour":
            return now.strftime("%Y-%m-%d:%H:00")
        elif period == "day":
            return now.strftime("%Y-%m-%d")
        else:
            raise ValueError(f"Invalid period: {period}")

    async def increment(
        self,
        counter_key: str,
        amount: int = 1,
        ttl_seconds: Optional[int] = None
    ) -> int:
        """
        Increment counter atomically

        Args:
            counter_key: Counter key
            amount: Amount to increment
            ttl_seconds: TTL for key (optional)

        Returns:
            New counter value
        """
        redis = self._get_redis()

        # Atomic increment
        new_value = await redis.incrby(counter_key, amount)

        # Set TTL if specified and key is new
        if ttl_seconds and new_value == amount:
            await redis.expire(counter_key, ttl_seconds)

        return new_value

    async def get(self, counter_key: str) -> int:
        """
        Get counter value

        Args:
            counter_key: Counter key

        Returns:
            Counter value (0 if not exists)
        """
        redis = self._get_redis()
        value = await redis.get(counter_key)
        return int(value) if value else 0

    async def get_multiple(
        self,
        counter_keys: List[str]
    ) -> Dict[str, int]:
        """
        Get multiple counters efficiently

        Args:
            counter_keys: List of counter keys

        Returns:
            Dict mapping key to value
        """
        redis = self._get_redis()

        # Use pipeline for efficiency
        pipeline = redis.pipeline()
        for key in counter_keys:
            pipeline.get(key)

        values = await pipeline.execute()

        return {
            key: int(value) if value else 0
            for key, value in zip(counter_keys, values)
        }


# Global manager
_counter_manager: Optional[RedisCounterManager] = None


def get_counter_manager() -> RedisCounterManager:
    """Get global counter manager"""
    global _counter_manager
    if _counter_manager is None:
        _counter_manager = RedisCounterManager()
    return _counter_manager


# ==============================================================================
# High-Level Functions
# ==============================================================================

async def track_agent_call(
    agent_name: str,
    success: bool,
    execution_time_ms: int,
    tokens_used: int = 0,
    model: str = "unknown"
) -> None:
    """
    Track agent call metrics

    Updates:
    - Total calls
    - Success/failure counts
    - Execution time (for averaging)
    - Token usage
    - Model distribution

    Args:
        agent_name: Agent name
        success: Whether call succeeded
        execution_time_ms: Execution time in milliseconds
        tokens_used: Tokens consumed
        model: Model used
    """
    manager = get_counter_manager()

    # Track for multiple periods
    for period in ["hour", "day"]:
        period_key = manager._get_period_key(period)

        # TTL: 2 hours for hourly, 7 days for daily
        ttl = 7200 if period == "hour" else 604800

        # Increment counters
        await manager.increment(
            f"agent:{agent_name}:calls:total:{period_key}",
            1,
            ttl
        )

        if success:
            await manager.increment(
                f"agent:{agent_name}:calls:success:{period_key}",
                1,
                ttl
            )
        else:
            await manager.increment(
                f"agent:{agent_name}:calls:failure:{period_key}",
                1,
                ttl
            )

        # Track execution time (for averaging)
        await manager.increment(
            f"agent:{agent_name}:time:total:{period_key}",
            execution_time_ms,
            ttl
        )

        # Track tokens
        if tokens_used > 0:
            await manager.increment(
                f"agent:{agent_name}:tokens:total:{period_key}",
                tokens_used,
                ttl
            )

        # Track model usage
        await manager.increment(
            f"agent:{agent_name}:model:{model}:{period_key}",
            1,
            ttl
        )


async def get_agent_metrics(
    agent_name: str,
    period: str = "hour"
) -> AgentMetrics:
    """
    Get agent metrics for period

    Args:
        agent_name: Agent name
        period: "hour" or "day"

    Returns:
        AgentMetrics object
    """
    manager = get_counter_manager()
    period_key = manager._get_period_key(period)

    # Build counter keys
    keys = {
        "total": f"agent:{agent_name}:calls:total:{period_key}",
        "success": f"agent:{agent_name}:calls:success:{period_key}",
        "failure": f"agent:{agent_name}:calls:failure:{period_key}",
        "time_total": f"agent:{agent_name}:time:total:{period_key}",
        "tokens": f"agent:{agent_name}:tokens:total:{period_key}",
    }

    # Fetch all at once
    values = await manager.get_multiple(list(keys.values()))
    counters = {name: values[key] for name, key in keys.items()}

    # Calculate derived metrics
    total_calls = counters["total"]
    avg_time_ms = (
        counters["time_total"] / total_calls
        if total_calls > 0 else 0.0
    )
    avg_tokens = (
        counters["tokens"] / total_calls
        if total_calls > 0 else 0.0
    )

    return AgentMetrics(
        agent_name=agent_name,
        period=period,
        total_calls=counters["total"],
        successful_calls=counters["success"],
        failed_calls=counters["failure"],
        avg_execution_time_ms=avg_time_ms,
        total_tokens=counters["tokens"],
        avg_tokens_per_call=avg_tokens
    )


async def increment_counter(
    key: str,
    amount: int = 1,
    ttl: Optional[int] = None
) -> int:
    """
    Convenience function to increment counter

    Args:
        key: Counter key
        amount: Amount to increment
        ttl: TTL in seconds

    Returns:
        New value
    """
    manager = get_counter_manager()
    return await manager.increment(key, amount, ttl)


async def get_counter(key: str) -> int:
    """
    Convenience function to get counter

    Args:
        key: Counter key

    Returns:
        Counter value
    """
    manager = get_counter_manager()
    return await manager.get(key)
