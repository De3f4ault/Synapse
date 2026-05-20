"""
Search Analytics Logger.

Fire-and-forget analytics for the search bus. INSERT never blocks the
search response — errors are swallowed and logged.
"""

import structlog
import re
from typing import Optional, List

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = structlog.get_logger(__name__)

# Simple question marker  (starts or contains a question word / ends with ?)
_QUESTION_RE = re.compile(
    r"(^(who|what|when|where|why|how|which|is|are|can|do|does)\b|[?]$)", re.IGNORECASE
)


async def log_search_query(
    db: AsyncSession,
    *,
    user_id: int,
    query: str,
    intent: Optional[str] = None,
    surface: Optional[str] = None,
    result_count: int = 0,
    engines_used: Optional[List[str]] = None,
    candidate_count_hybrid: Optional[int] = None,
    candidate_count_rag: Optional[int] = None,
    candidate_count_graph: Optional[int] = None,
    total_latency_ms: Optional[int] = None,
    hybrid_latency_ms: Optional[int] = None,
    rag_latency_ms: Optional[int] = None,
    graph_latency_ms: Optional[int] = None,
    rerank_latency_ms: Optional[int] = None,
    auto_retry: bool = False,
) -> Optional[int]:
    """
    Record a search query in the analytics table.

    Designed to be called fire-and-forget. Never raises — errors are
    logged and swallowed so as not to impact search latency.

    Returns the search_query ID (for click tracking), or None on failure.
    """
    try:
        result = await db.execute(
            text("""
                INSERT INTO developer_schema.search_queries (
                    user_id, query, intent, surface,
                    query_length, contains_question,
                    result_count, engines_used,
                    candidate_count_hybrid, candidate_count_rag, candidate_count_graph,
                    total_latency_ms, hybrid_latency_ms, rag_latency_ms,
                    graph_latency_ms, rerank_latency_ms,
                    auto_retry
                ) VALUES (
                    :user_id, :query, :intent, :surface,
                    :query_length, :contains_question,
                    :result_count, :engines_used,
                    :candidate_count_hybrid, :candidate_count_rag, :candidate_count_graph,
                    :total_latency_ms, :hybrid_latency_ms, :rag_latency_ms,
                    :graph_latency_ms, :rerank_latency_ms,
                    :auto_retry
                )
                RETURNING id
            """),
            {
                "user_id": user_id,
                "query": query,
                "intent": intent,
                "surface": surface,
                "query_length": len(query),
                "contains_question": bool(_QUESTION_RE.search(query)),
                "result_count": result_count,
                "engines_used": engines_used or [],
                "candidate_count_hybrid": candidate_count_hybrid,
                "candidate_count_rag": candidate_count_rag,
                "candidate_count_graph": candidate_count_graph,
                "total_latency_ms": total_latency_ms,
                "hybrid_latency_ms": hybrid_latency_ms,
                "rag_latency_ms": rag_latency_ms,
                "graph_latency_ms": graph_latency_ms,
                "rerank_latency_ms": rerank_latency_ms,
                "auto_retry": auto_retry,
            },
        )
        row = result.fetchone()
        query_id = row[0] if row else None
        await db.commit()
        return query_id

    except Exception as e:
        logger.warning("search_analytics_log_failed", error=str(e)[:200])
        try:
            await db.rollback()
        except Exception:
            pass
        return None


async def log_search_click(
    db: AsyncSession,
    *,
    query_id: int,
    clicked_entity_id: int,
    clicked_entity_type: str,
    clicked_rank: int,
) -> bool:
    """
    Record a click on a search result.

    Updates the search_queries row with click information.
    Called from POST /search/click endpoint.
    """
    try:
        await db.execute(
            text("""
                UPDATE developer_schema.search_queries
                SET clicked_entity_id   = :entity_id,
                    clicked_entity_type = :entity_type,
                    clicked_rank        = :rank
                WHERE id = :query_id
            """),
            {
                "query_id": query_id,
                "entity_id": clicked_entity_id,
                "entity_type": clicked_entity_type,
                "rank": clicked_rank,
            },
        )
        await db.commit()
        return True

    except Exception as e:
        logger.warning("search_click_log_failed", error=str(e)[:200])
        try:
            await db.rollback()
        except Exception:
            pass
        return False


async def detect_reformulation(
    db: AsyncSession,
    *,
    user_id: int,
    current_query_id: int,
    window_seconds: int = 30,
) -> None:
    """
    Detect if this query is a reformulation of a recent query.

    Rule: Same user, different query text, within `window_seconds`.
    Updates the current query row with reformulation metadata.
    """
    try:
        # NOTE: PostgreSQL INTERVAL doesn't support parameterized values,
        # so we interpolate window_seconds directly. It's safe because
        # window_seconds is always an int from the function signature.
        interval_literal = f"{int(window_seconds)} seconds"
        await db.execute(
            text(f"""
                WITH prev AS (
                    SELECT id, query, created_at
                    FROM developer_schema.search_queries
                    WHERE user_id = :user_id
                      AND id < :current_id
                    ORDER BY created_at DESC
                    LIMIT 1
                )
                UPDATE developer_schema.search_queries sq
                SET reformulates_previous   = TRUE,
                    previous_query_id       = prev.id,
                    time_since_last_query_ms = EXTRACT(EPOCH FROM (sq.created_at - prev.created_at))::INT * 1000
                FROM prev
                WHERE sq.id = :current_id
                  AND prev.query != sq.query
                  AND sq.created_at - prev.created_at < INTERVAL '{interval_literal}'
            """),
            {
                "user_id": user_id,
                "current_id": current_query_id,
            },
        )
        await db.commit()

    except Exception as e:
        logger.warning("reformulation_detection_failed", error=str(e)[:200])
        try:
            await db.rollback()
        except Exception:
            pass
