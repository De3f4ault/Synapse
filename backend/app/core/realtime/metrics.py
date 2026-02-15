"""
Real-time agent and user activity metrics using PostgreSQL.

Replaces Redis sorted sets (ZADD/ZRANGE) and sets (SADD/SCARD)
with the agent_metrics and user_activity UNLOGGED tables.
Counter-based metrics use the kv_store table via PgCacheClient.
"""

from datetime import date
from typing import Dict, Optional

from sqlalchemy import text

from app.utils.logging import get_logger

logger = get_logger(__name__)


# ============================================================================
# Agent Metrics (replaces Redis sorted sets + counters)
# ============================================================================


async def record_agent_invocation(
    agent_name: str,
    success: bool,
    duration_ms: int,
    tokens_used: Optional[int] = None,
    model: Optional[str] = None,
) -> None:
    """
    Record an agent invocation in the agent_metrics table.

    Replaces Redis ZADD for response time tracking and INCR for counters.

    Args:
        agent_name: Name of the agent
        success: Whether the invocation succeeded
        duration_ms: Duration in milliseconds
        tokens_used: Optional token count
        model: Optional model identifier
    """
    try:
        from app.db.session import AsyncSessionLocal

        async with AsyncSessionLocal() as session:
            await session.execute(
                text("""
                    INSERT INTO agent_metrics
                    (agent_name, success, duration_ms, tokens_used, model)
                    VALUES (:agent_name, :success, :duration_ms, :tokens_used, :model)
                """),
                {
                    "agent_name": agent_name,
                    "success": success,
                    "duration_ms": duration_ms,
                    "tokens_used": tokens_used,
                    "model": model,
                },
            )
            await session.commit()
    except Exception as e:
        logger.error("record_agent_invocation_failed", agent=agent_name, error=str(e))


async def get_agent_stats(
    agent_name: str,
    window_hours: int = 24,
) -> Dict:
    """
    Get aggregated agent statistics.

    Replaces Redis ZRANGE + counter reads with a single SQL query.

    Args:
        agent_name: Agent name
        window_hours: Time window in hours

    Returns:
        Dict with total, success_count, failure_count, avg_duration_ms,
        p50_duration_ms, p95_duration_ms, total_tokens
    """
    try:
        from app.db.session import AsyncSessionLocal

        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("""
                    SELECT
                        COUNT(*) as total,
                        COUNT(*) FILTER (WHERE success = TRUE) as success_count,
                        COUNT(*) FILTER (WHERE success = FALSE) as failure_count,
                        COALESCE(AVG(duration_ms), 0)::int as avg_duration_ms,
                        COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_ms), 0)::int as p50_duration_ms,
                        COALESCE(percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms), 0)::int as p95_duration_ms,
                        COALESCE(SUM(tokens_used), 0)::int as total_tokens
                    FROM agent_metrics
                    WHERE agent_name = :agent_name
                    AND created_at > now() - make_interval(hours => :window_hours)
                """),
                {"agent_name": agent_name, "window_hours": window_hours},
            )
            row = result.fetchone()
            if row is None:
                return {
                    "total": 0,
                    "success_count": 0,
                    "failure_count": 0,
                    "avg_duration_ms": 0,
                    "p50_duration_ms": 0,
                    "p95_duration_ms": 0,
                    "total_tokens": 0,
                }
            return {
                "total": row[0],
                "success_count": row[1],
                "failure_count": row[2],
                "avg_duration_ms": row[3],
                "p50_duration_ms": row[4],
                "p95_duration_ms": row[5],
                "total_tokens": row[6],
            }
    except Exception as e:
        logger.error("get_agent_stats_failed", agent=agent_name, error=str(e))
        return {
            "total": 0,
            "success_count": 0,
            "failure_count": 0,
            "avg_duration_ms": 0,
            "p50_duration_ms": 0,
            "p95_duration_ms": 0,
            "total_tokens": 0,
        }


# ============================================================================
# User Activity (replaces Redis SADD/SCARD/SUNIONSTORE)
# ============================================================================


async def record_user_activity(user_id: int) -> None:
    """
    Record user activity for the current day.

    Uses INSERT ON CONFLICT DO NOTHING for deduplication (same user+day).

    Args:
        user_id: User ID
    """
    try:
        from app.db.session import AsyncSessionLocal

        async with AsyncSessionLocal() as session:
            await session.execute(
                text("""
                    INSERT INTO user_activity (user_id, activity_date)
                    VALUES (:user_id, CURRENT_DATE)
                    ON CONFLICT (user_id, activity_date) DO NOTHING
                """),
                {"user_id": user_id},
            )
            await session.commit()
    except Exception as e:
        logger.error("record_user_activity_failed", user_id=user_id, error=str(e))


async def get_daily_active_users(target_date: Optional[date] = None) -> int:
    """
    Get count of daily active users.

    Args:
        target_date: Date to check (default: today)

    Returns:
        int: Number of unique active users
    """
    try:
        from app.db.session import AsyncSessionLocal

        d = target_date or date.today()
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("""
                    SELECT COUNT(DISTINCT user_id) FROM user_activity
                    WHERE activity_date = :d
                """),
                {"d": d},
            )
            return result.scalar_one_or_none() or 0
    except Exception as e:
        logger.error("get_dau_failed", error=str(e))
        return 0


async def get_weekly_active_users() -> int:
    """
    Get count of weekly active users (last 7 days).

    Returns:
        int: Number of unique active users in the last 7 days
    """
    try:
        from app.db.session import AsyncSessionLocal

        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("""
                    SELECT COUNT(DISTINCT user_id) FROM user_activity
                    WHERE activity_date >= CURRENT_DATE - 7
                """)
            )
            return result.scalar_one_or_none() or 0
    except Exception as e:
        logger.error("get_wau_failed", error=str(e))
        return 0


async def get_monthly_active_users() -> int:
    """
    Get count of monthly active users (last 30 days).

    Returns:
        int: Number of unique active users in the last 30 days
    """
    try:
        from app.db.session import AsyncSessionLocal

        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("""
                    SELECT COUNT(DISTINCT user_id) FROM user_activity
                    WHERE activity_date >= CURRENT_DATE - 30
                """)
            )
            return result.scalar_one_or_none() or 0
    except Exception as e:
        logger.error("get_mau_failed", error=str(e))
        return 0
