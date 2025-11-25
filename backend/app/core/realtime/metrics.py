"""
Real-time metric tracking for agents and user activity.
Uses Redis for sub-millisecond performance.
"""
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from app.core.realtime.counters import increment, increment_with_ttl, get_counter, get_multiple
from app.services.cache.client import get_redis
from app.utils.logging import get_logger

logger = get_logger(__name__)


async def track_agent_call(
    agent_name: str,
    success: bool,
    duration_ms: int
) -> None:
    """
    Track an agent execution.

    Args:
        agent_name: Name of the agent
        success: Whether execution was successful
        duration_ms: Execution duration in milliseconds
    """
    try:
        # Get current hour for time-windowed metrics
        current_hour = datetime.utcnow().strftime("%Y-%m-%d-%H")

        # Increment call counters (1 hour TTL)
        await increment_with_ttl(f"agent:{agent_name}:calls:{current_hour}", 1, 3600)
        await increment_with_ttl(f"agent:{agent_name}:calls:total", 1, 86400)  # 24h TTL

        # Track success/failure
        if success:
            await increment_with_ttl(f"agent:{agent_name}:success:{current_hour}", 1, 3600)
        else:
            await increment_with_ttl(f"agent:{agent_name}:failures:{current_hour}", 1, 3600)

        # Track response time using sorted set (for percentile calculations)
        redis = await get_redis()
        timestamp = time.time()
        await redis.zadd(
            f"agent:{agent_name}:response_times:{current_hour}",
            {f"{timestamp}:{duration_ms}": duration_ms}
        )
        # Set TTL on sorted set
        await redis.expire(f"agent:{agent_name}:response_times:{current_hour}", 3600)

    except Exception as e:
        logger.error(
            "track_agent_call_failed",
            agent_name=agent_name,
            error=str(e),
        )


async def get_agent_metrics(
    agent_name: str,
    period: str = "hour"
) -> Dict[str, any]:
    """
    Get metrics for an agent.

    Args:
        agent_name: Name of the agent
        period: Time period ("hour" or "day")

    Returns:
        Dict with agent metrics
    """
    try:
        if period == "hour":
            time_key = datetime.utcnow().strftime("%Y-%m-%d-%H")
        else:  # day
            time_key = "total"

        # Get counters
        calls = await get_counter(f"agent:{agent_name}:calls:{time_key}")
        successes = await get_counter(f"agent:{agent_name}:success:{time_key}")
        failures = await get_counter(f"agent:{agent_name}:failures:{time_key}")

        # Calculate metrics
        failure_rate = failures / calls if calls > 0 else 0.0
        success_rate = successes / calls if calls > 0 else 0.0

        # Get response time stats
        redis = await get_redis()
        response_times_key = f"agent:{agent_name}:response_times:{time_key}"

        # Get all response times from sorted set
        response_times = await redis.zrange(
            response_times_key,
            0,
            -1,
            withscores=True
        )

        avg_response_time = 0
        p95_response_time = 0

        if response_times:
            # Extract scores (durations)
            durations = [score for _, score in response_times]
            avg_response_time = sum(durations) / len(durations)

            # Calculate p95
            sorted_durations = sorted(durations)
            p95_index = int(len(sorted_durations) * 0.95)
            p95_response_time = sorted_durations[p95_index] if p95_index < len(sorted_durations) else sorted_durations[-1]

        return {
            "agent_name": agent_name,
            "period": period,
            "calls": calls,
            "successes": successes,
            "failures": failures,
            "success_rate": success_rate,
            "failure_rate": failure_rate,
            "avg_response_time": avg_response_time,
            "p95_response_time": p95_response_time,
        }

    except Exception as e:
        logger.error(
            "get_agent_metrics_failed",
            agent_name=agent_name,
            error=str(e),
        )
        return {
            "agent_name": agent_name,
            "period": period,
            "calls": 0,
            "successes": 0,
            "failures": 0,
            "success_rate": 0.0,
            "failure_rate": 0.0,
            "avg_response_time": 0,
            "p95_response_time": 0,
        }


async def track_user_activity(user_id: int, activity: str) -> None:
    """
    Track user activity.

    Args:
        user_id: ID of the user
        activity: Activity type (e.g., "card_reviewed", "note_created")
    """
    try:
        today = datetime.utcnow().strftime("%Y-%m-%d")

        # Increment activity counter
        await increment_with_ttl(
            f"user:{user_id}:activity:{activity}:{today}",
            1,
            86400  # 24h TTL
        )

        # Track last active
        redis = await get_redis()
        await redis.set(
            f"user:{user_id}:last_active",
            datetime.utcnow().isoformat(),
            ex=2592000  # 30 days TTL
        )

        # Add to active users set for today
        await redis.sadd(f"active_users:{today}", user_id)
        await redis.expire(f"active_users:{today}", 86400)

    except Exception as e:
        logger.error(
            "track_user_activity_failed",
            user_id=user_id,
            activity=activity,
            error=str(e),
        )


async def get_active_users(period: str = "day") -> int:
    """
    Get count of active users.

    Args:
        period: Time period ("day", "week", "month")

    Returns:
        int: Number of active users
    """
    try:
        redis = await get_redis()

        if period == "day":
            today = datetime.utcnow().strftime("%Y-%m-%d")
            count = await redis.scard(f"active_users:{today}")
            return count

        elif period == "week":
            # Union of last 7 days
            days = [
                (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d")
                for i in range(7)
            ]
            keys = [f"active_users:{day}" for day in days]

            # Use temporary key for union
            temp_key = f"active_users:week:{int(time.time())}"
            if keys:
                await redis.sunionstore(temp_key, *keys)
                count = await redis.scard(temp_key)
                await redis.delete(temp_key)
                return count
            return 0

        elif period == "month":
            # Union of last 30 days
            days = [
                (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d")
                for i in range(30)
            ]
            keys = [f"active_users:{day}" for day in days]

            temp_key = f"active_users:month:{int(time.time())}"
            if keys:
                await redis.sunionstore(temp_key, *keys)
                count = await redis.scard(temp_key)
                await redis.delete(temp_key)
                return count
            return 0

        return 0

    except Exception as e:
        logger.error(
            "get_active_users_failed",
            period=period,
            error=str(e),
        )
        return 0


async def get_user_activity_summary(user_id: int, days: int = 7) -> Dict[str, int]:
    """
    Get summary of user activity over a period.

    Args:
        user_id: ID of the user
        days: Number of days to look back

    Returns:
        Dict with activity counts by type
    """
    try:
        # Get all activity keys for user
        pattern = f"user:{user_id}:activity:*"
        activity_counters = await get_multiple(pattern)

        # Aggregate by activity type
        summary = {}
        for key, count in activity_counters.items():
            # Extract activity type from key
            # Format: user:{user_id}:activity:{activity_type}:{date}
            parts = key.split(":")
            if len(parts) >= 4:
                activity_type = parts[3]
                summary[activity_type] = summary.get(activity_type, 0) + count

        return summary

    except Exception as e:
        logger.error(
            "get_user_activity_summary_failed",
            user_id=user_id,
            error=str(e),
        )
        return {}
