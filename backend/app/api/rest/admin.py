"""
Admin Dashboard REST API.

All endpoints in this module require is_admin = True.
Every query explicitly enumerates columns — SELECT * is banned here.
Schema drift fails loudly at Pydantic validation (422) rather than
silently returning null fields to the React layer.

CONNECTION ROUTING:
    - get_primary_health_db() → direct asyncpg to Primary (pg_stat_* only)
    - get_analytics_db()      → Logical Replica (MATERIALIZED VIEW reads)
    - get_db()                → Primary writer pool (User governance writes)

DATA FRESHNESS:
    Every response from the Replica includes a `data_as_of` timestamp
    sourced from pg_stat_subscription.latest_end_time. The React layer
    displays "Data as of X minutes ago."
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    get_analytics_db,
    get_db,
    get_primary_health_db,
    require_admin,
)
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()


# =============================================================================
# Response Models (Pydantic contracts — explicit columns only)
# =============================================================================

class ReplicationSlotStatus(BaseModel):
    slot_name: str
    active: bool
    wal_lag_human: str
    wal_lag_bytes: int
    severity: str  # "OK" | "WARNING" | "CRITICAL"


class SubscriptionStatus(BaseModel):
    subname: str
    subenabled: bool
    subscription_lag_bytes: Optional[int]
    lag_human: Optional[str]
    latest_end_time: Optional[datetime]
    seconds_since_last_receive: Optional[float]
    severity: str  # "OK" | "WARNING" | "CRITICAL" | "UNKNOWN"


class ReplicationHealthResponse(BaseModel):
    primary_slots: list[ReplicationSlotStatus]
    replica_subscription: Optional[SubscriptionStatus]
    data_as_of: Optional[datetime]


class DatabaseServerHealthResponse(BaseModel):
    db_size_human: str
    db_size_bytes: int
    active_connections: int
    idle_in_transaction: int
    long_running_queries: int
    table_cache_hit_ratio: Optional[float]
    index_cache_hit_ratio: Optional[float]
    total_dead_tuples: Optional[int]
    total_live_tuples: Optional[int]
    autovacuum_workers_active: int


class AIUsageDailyCost(BaseModel):
    metric_date: datetime
    daily_active_users: int
    total_tokens_burned: Optional[int]
    total_cost_usd: Optional[float]
    avg_cost_per_call: Optional[float]
    total_api_calls: int
    failed_calls: int
    failure_rate_pct: Optional[float]
    grounding_invocations: int
    avg_latency_ms: Optional[float]
    flash_model_calls: int
    pro_model_calls: int


class AIUsageCostsResponse(BaseModel):
    rows: list[AIUsageDailyCost]
    data_as_of: Optional[datetime]


class AgentPerfRow(BaseModel):
    agent_type: str
    day: datetime
    total_runs: int
    failed_runs: int
    failure_rate_pct: Optional[float]
    avg_react_iterations: Optional[float]
    avg_execution_seconds: Optional[float]
    avg_tokens_per_run: Optional[float]
    total_cost_usd: Optional[float]
    most_common_error: Optional[str]


class AgentPerformanceResponse(BaseModel):
    rows: list[AgentPerfRow]
    data_as_of: Optional[datetime]


class DocumentPipelineRow(BaseModel):
    processing_status: str
    document_count: int
    total_bytes: Optional[int]
    total_size_human: Optional[str]
    avg_file_size_bytes: Optional[float]
    ocr_processed_count: int
    oldest_in_status: Optional[datetime]
    newest_update: Optional[datetime]


class DocumentPipelineResponse(BaseModel):
    pipeline: list[DocumentPipelineRow]
    stuck_parsing: int    # Documents in PARSING/CHUNKING for > 1 hour
    stuck_chunking: int
    data_as_of: Optional[datetime]


class WebhookDeliveryRow(BaseModel):
    day: datetime
    event_type: str
    total_deliveries: int
    successful: int
    failed: int
    pending: int
    success_rate_pct: Optional[float]
    avg_attempts_per_delivery: Optional[float]
    max_attempts_seen: Optional[int]


class WebhookDeliveryResponse(BaseModel):
    rows: list[WebhookDeliveryRow]
    data_as_of: Optional[datetime]


class WorkflowExecutionRow(BaseModel):
    week: datetime
    trigger_label: str
    total_executions: int
    unique_docs_processed: int


class WorkflowExecutionResponse(BaseModel):
    rows: list[WorkflowExecutionRow]
    data_as_of: Optional[datetime]


class LearningActivityRow(BaseModel):
    day: datetime
    active_learners: int
    total_study_minutes: Optional[float]
    platform_avg_accuracy: Optional[float]
    flashcard_reviews: int
    quiz_attempts: int
    grounded_answers: int
    completed_sessions: int


class LearningActivityResponse(BaseModel):
    rows: list[LearningActivityRow]
    data_as_of: Optional[datetime]


class QdrantCollectionInfo(BaseModel):
    collection_name: str
    vector_count: Optional[int]
    indexed_vector_count: Optional[int]
    points_count: Optional[int]
    status: str
    optimizer_ok: bool


class QdrantHealthResponse(BaseModel):
    collections: list[QdrantCollectionInfo]
    total_collections: int


class CeleryWorkerResponse(BaseModel):
    active_workers: list[str]
    worker_count: int
    queue_depths: dict[str, int]
    total_active_tasks: int


class AdminUserRow(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    is_active: bool
    is_admin: bool
    created_at: datetime
    last_login: Optional[datetime]
    total_storage_bytes: int
    total_storage_human: str
    document_count: int


class UserListResponse(BaseModel):
    users: list[AdminUserRow]
    total: int
    page: int
    page_size: int


# =============================================================================
# Helper: fetch data freshness timestamp from Replica
# =============================================================================

async def _get_replica_freshness(db: AsyncSession) -> Optional[datetime]:
    """
    Fetch the last replication event timestamp from the Replica's
    pg_stat_subscription. Included in every Replica-sourced API response.
    """
    try:
        result = await db.execute(text(
            "SELECT latest_end_time "
            "FROM pg_stat_subscription "
            "WHERE subname = 'synapse_telemetry_sub' "
            "LIMIT 1"
        ))
        row = result.fetchone()
        return row[0] if row else None
    except Exception:
        return None


# =============================================================================
# 1. Replication Health (ALWAYS FIRST — Primary slots + Replica subscription)
# =============================================================================

@router.get(
    "/replication-health",
    response_model=ReplicationHealthResponse,
    summary="Replication health: WAL lag (Primary) + subscription status (Replica)",
)
async def get_replication_health(
    conn: asyncpg.Connection = Depends(get_primary_health_db),
    analytics_db: AsyncSession = Depends(get_analytics_db),
    _: User = Depends(require_admin),
) -> ReplicationHealthResponse:
    """
    Combined replication health check — both sides of the replication stream.

    Primary side:  pg_replication_slots (WAL bloat, slot alive/dead)
    Replica side:  pg_stat_subscription (subscription worker alive, lag bytes)

    Alert thresholds (applied in React DatabaseReplicationStatus component):
        WAL lag > 10 GB  → WARNING
        WAL lag > 50 GB  → CRITICAL (auto-drop slot fires at this threshold)
        Replica silent > 5 min → CRITICAL (subscription worker likely crashed)
    """
    # Primary: replication slot status
    slot_rows = await conn.fetch("""
        SELECT
            slot_name,
            active,
            pg_size_pretty(
                pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)
            )                                                       AS wal_lag_human,
            pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)    AS wal_lag_bytes
        FROM pg_replication_slots
        WHERE slot_type = 'logical'
    """)

    slots = []
    for row in slot_rows:
        lag = row["wal_lag_bytes"] or 0
        if lag > 53_687_091_200:   # 50 GB
            severity = "CRITICAL"
        elif lag > 10_737_418_240: # 10 GB
            severity = "WARNING"
        else:
            severity = "OK"
        slots.append(ReplicationSlotStatus(
            slot_name=row["slot_name"],
            active=row["active"],
            wal_lag_human=row["wal_lag_human"],
            wal_lag_bytes=lag,
            severity=severity,
        ))

    # Replica: subscription worker status
    replica_sub: Optional[SubscriptionStatus] = None
    try:
        sub_result = await analytics_db.execute(text("""
            SELECT
                subname,
                subenabled,
                pg_wal_lsn_diff(latest_end_lsn, received_lsn)      AS subscription_lag_bytes,
                pg_size_pretty(
                    pg_wal_lsn_diff(latest_end_lsn, received_lsn)
                )                                                   AS lag_human,
                latest_end_time,
                extract(epoch from (now() - latest_end_time))       AS seconds_since_last_receive
            FROM pg_stat_subscription
            LIMIT 1
        """))
        sub_row = sub_result.fetchone()
        if sub_row:
            secs = sub_row[5] or 0
            if secs > 300:
                sub_severity = "CRITICAL"
            elif secs > 60:
                sub_severity = "WARNING"
            else:
                sub_severity = "OK"
            replica_sub = SubscriptionStatus(
                subname=sub_row[0],
                subenabled=sub_row[1],
                subscription_lag_bytes=sub_row[2],
                lag_human=sub_row[3],
                latest_end_time=sub_row[4],
                seconds_since_last_receive=secs,
                severity=sub_severity,
            )
    except Exception as exc:
        logger.warning("Could not fetch replica subscription status: %s", exc)
        replica_sub = SubscriptionStatus(
            subname="synapse_telemetry_sub",
            subenabled=False,
            subscription_lag_bytes=None,
            lag_human=None,
            latest_end_time=None,
            seconds_since_last_receive=None,
            severity="UNKNOWN",
        )

    data_as_of = await _get_replica_freshness(analytics_db)
    return ReplicationHealthResponse(
        primary_slots=slots,
        replica_subscription=replica_sub,
        data_as_of=data_as_of,
    )


# =============================================================================
# 2. Primary Database Server Health
# =============================================================================

@router.get(
    "/db-health",
    response_model=DatabaseServerHealthResponse,
    summary="Primary database server health: connections, cache hit ratios, bloat",
)
async def get_db_health(
    conn: asyncpg.Connection = Depends(get_primary_health_db),
    _: User = Depends(require_admin),
) -> DatabaseServerHealthResponse:
    row = await conn.fetchrow("""
        SELECT
            pg_size_pretty(pg_database_size(current_database()))       AS db_size_human,
            pg_database_size(current_database())                        AS db_size_bytes,
            (SELECT count(*) FROM pg_stat_activity
             WHERE state = 'active')                                   AS active_connections,
            (SELECT count(*) FROM pg_stat_activity
             WHERE state = 'idle in transaction')                      AS idle_in_transaction,
            (SELECT count(*) FROM pg_stat_activity
             WHERE state = 'active'
               AND now() - query_start > interval '30 seconds')       AS long_running_queries,
            ROUND(
                (blks_hit::numeric / NULLIF(blks_hit + blks_read, 0))::numeric, 4
            )                                                          AS table_cache_hit_ratio,
            ROUND((
                SELECT sum(idx_blks_hit)::numeric
                       / NULLIF(sum(idx_blks_hit + idx_blks_read), 0)
                FROM pg_statio_user_tables
            )::numeric, 4)                                             AS index_cache_hit_ratio,
            (SELECT sum(n_dead_tup) FROM pg_stat_user_tables)         AS total_dead_tuples,
            (SELECT sum(n_live_tup) FROM pg_stat_user_tables)         AS total_live_tuples,
            (SELECT count(*) FROM pg_stat_activity
             WHERE query LIKE 'autovacuum:%')                          AS autovacuum_workers_active
        FROM pg_stat_database
        WHERE datname = current_database()
    """)

    if not row:
        raise HTTPException(status_code=500, detail="Could not fetch database health stats")

    return DatabaseServerHealthResponse(**dict(row))


# =============================================================================
# 3. AI Usage Daily Costs (Replica MATERIALIZED VIEW)
# =============================================================================

@router.get(
    "/ai-usage-costs",
    response_model=AIUsageCostsResponse,
    summary="AI usage costs: token burn, LLM spend, model breakdown (last 30 days)",
)
async def get_ai_usage_costs(
    days: int = 30,
    db: AsyncSession = Depends(get_analytics_db),
    _: User = Depends(require_admin),
) -> AIUsageCostsResponse:
    result = await db.execute(text("""
        SELECT
            metric_date, daily_active_users, total_tokens_burned,
            total_cost_usd, avg_cost_per_call, total_api_calls,
            failed_calls, failure_rate_pct, grounding_invocations,
            avg_latency_ms, flash_model_calls, pro_model_calls
        FROM admin_ai_usage_daily_costs
        WHERE metric_date >= now() - make_interval(days => :days)
        ORDER BY metric_date DESC
    """), {"days": days})

    rows = [AIUsageDailyCost(**dict(r._mapping)) for r in result.fetchall()]
    data_as_of = await _get_replica_freshness(db)
    return AIUsageCostsResponse(rows=rows, data_as_of=data_as_of)


# =============================================================================
# 4. AI Agent Performance (Replica MATERIALIZED VIEW)
# =============================================================================

@router.get(
    "/agent-performance",
    response_model=AgentPerformanceResponse,
    summary="AI agent performance: ReAct iterations, failure rates, cost by agent type",
)
async def get_agent_performance(
    days: int = 30,
    db: AsyncSession = Depends(get_analytics_db),
    _: User = Depends(require_admin),
) -> AgentPerformanceResponse:
    result = await db.execute(text("""
        SELECT
            agent_type, day, total_runs, failed_runs, failure_rate_pct,
            avg_react_iterations, avg_execution_seconds, avg_tokens_per_run,
            total_cost_usd, most_common_error
        FROM admin_agent_perf_by_type
        WHERE day >= now() - make_interval(days => :days)
        ORDER BY day DESC, total_runs DESC
    """), {"days": days})

    rows = [AgentPerfRow(**dict(r._mapping)) for r in result.fetchall()]
    data_as_of = await _get_replica_freshness(db)
    return AgentPerformanceResponse(rows=rows, data_as_of=data_as_of)


# =============================================================================
# 5. Document Ingestion Pipeline Status (Replica MATERIALIZED VIEW)
# =============================================================================

@router.get(
    "/document-pipeline",
    response_model=DocumentPipelineResponse,
    summary="Document ingestion funnel: status counts + stuck document detection",
)
async def get_document_pipeline(
    db: AsyncSession = Depends(get_analytics_db),
    _: User = Depends(require_admin),
) -> DocumentPipelineResponse:
    pipeline_result = await db.execute(text("""
        SELECT
            processing_status, document_count, total_bytes,
            total_size_human, avg_file_size_bytes, ocr_processed_count,
            oldest_in_status, newest_update
        FROM admin_document_pipeline_status
        ORDER BY
            CASE processing_status
                WHEN 'failed'    THEN 1
                WHEN 'pending'   THEN 2
                WHEN 'parsing'   THEN 3
                WHEN 'parsed'    THEN 4
                WHEN 'chunking'  THEN 5
                WHEN 'completed' THEN 6
                ELSE 7
            END
    """))

    # Live stuck-document query — always runs against current data
    stuck_result = await db.execute(text("""
        SELECT
            processing_status,
            COUNT(*) AS stuck_count
        FROM documents
        WHERE processing_status IN ('parsing', 'chunking')
          AND updated_at < now() - interval '1 hour'
          AND deleted_at IS NULL
        GROUP BY processing_status
    """))

    stuck_map = {row[0]: row[1] for row in stuck_result.fetchall()}
    pipeline = [DocumentPipelineRow(**dict(r._mapping)) for r in pipeline_result.fetchall()]
    data_as_of = await _get_replica_freshness(db)

    return DocumentPipelineResponse(
        pipeline=pipeline,
        stuck_parsing=stuck_map.get("parsing", 0),
        stuck_chunking=stuck_map.get("chunking", 0),
        data_as_of=data_as_of,
    )


# =============================================================================
# 6. Webhook Delivery Stats (Replica MATERIALIZED VIEW)
# =============================================================================

@router.get(
    "/webhook-delivery",
    response_model=WebhookDeliveryResponse,
    summary="Webhook delivery success/failure rates and retry patterns",
)
async def get_webhook_delivery(
    days: int = 14,
    db: AsyncSession = Depends(get_analytics_db),
    _: User = Depends(require_admin),
) -> WebhookDeliveryResponse:
    result = await db.execute(text("""
        SELECT
            day, event_type, total_deliveries, successful, failed,
            pending, success_rate_pct, avg_attempts_per_delivery, max_attempts_seen
        FROM admin_webhook_delivery_rates
        WHERE day >= now() - make_interval(days => :days)
        ORDER BY day DESC, failed DESC
    """), {"days": days})

    rows = [WebhookDeliveryRow(**dict(r._mapping)) for r in result.fetchall()]
    data_as_of = await _get_replica_freshness(db)
    return WebhookDeliveryResponse(rows=rows, data_as_of=data_as_of)


# =============================================================================
# 7. Automation Workflow Execution Stats (Replica MATERIALIZED VIEW)
# =============================================================================

@router.get(
    "/workflow-stats",
    response_model=WorkflowExecutionResponse,
    summary="Automation workflow trigger breakdown by type and week",
)
async def get_workflow_stats(
    weeks: int = 12,
    db: AsyncSession = Depends(get_analytics_db),
    _: User = Depends(require_admin),
) -> WorkflowExecutionResponse:
    result = await db.execute(text("""
        SELECT week, trigger_label, total_executions, unique_docs_processed
        FROM admin_workflow_execution_stats
        WHERE week >= now() - make_interval(weeks => :weeks)
        ORDER BY week DESC, total_executions DESC
    """), {"weeks": weeks})

    rows = [WorkflowExecutionRow(**dict(r._mapping)) for r in result.fetchall()]
    data_as_of = await _get_replica_freshness(db)
    return WorkflowExecutionResponse(rows=rows, data_as_of=data_as_of)


# =============================================================================
# 8. Platform Learning Activity (Replica MATERIALIZED VIEW)
# =============================================================================

@router.get(
    "/learning-activity",
    response_model=LearningActivityResponse,
    summary="Platform-wide learning activity: study minutes, accuracy, engagement",
)
async def get_learning_activity(
    days: int = 30,
    db: AsyncSession = Depends(get_analytics_db),
    _: User = Depends(require_admin),
) -> LearningActivityResponse:
    result = await db.execute(text("""
        SELECT
            day, active_learners, total_study_minutes, platform_avg_accuracy,
            flashcard_reviews, quiz_attempts, grounded_answers, completed_sessions
        FROM admin_platform_learning_daily
        WHERE day >= now() - make_interval(days => :days)
        ORDER BY day DESC
    """), {"days": days})

    rows = [LearningActivityRow(**dict(r._mapping)) for r in result.fetchall()]
    data_as_of = await _get_replica_freshness(db)
    return LearningActivityResponse(rows=rows, data_as_of=data_as_of)


# =============================================================================
# 9. Qdrant Vector Store Health (Qdrant Python client — not SQL)
# =============================================================================

@router.get(
    "/qdrant-health",
    response_model=QdrantHealthResponse,
    summary="Qdrant vector store: collection sizes, index status, optimizer health",
)
async def get_qdrant_health(
    _: User = Depends(require_admin),
) -> QdrantHealthResponse:
    try:
        from app.core.ai.rag.vector_store.qdrant.client import get_qdrant_client
        qdrant = get_qdrant_client()
        client = qdrant.get_client()
        collections = client.get_collections().collections

        detail = []
        for col in collections:
            info = client.get_collection(col.name)
            # optimizer_status may be a string "ok"/"error" or an object with .ok
            opt_status = info.optimizer_status
            if opt_status is None:
                optimizer_ok = False
            elif isinstance(opt_status, str):
                optimizer_ok = opt_status.lower() == "ok"
            else:
                optimizer_ok = bool(getattr(opt_status, "ok", False))
            detail.append(QdrantCollectionInfo(
                collection_name=col.name,
                # vectors_count removed in newer client versions — fall back gracefully
                vector_count=getattr(info, "vectors_count", None),
                indexed_vector_count=getattr(info, "indexed_vectors_count", None),
                points_count=getattr(info, "points_count", None),
                status=info.status.value if hasattr(info.status, "value") else str(info.status),
                optimizer_ok=optimizer_ok,
            ))

        return QdrantHealthResponse(
            collections=detail,
            total_collections=len(collections),
        )
    except Exception as exc:
        logger.error("Qdrant health check failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Qdrant unreachable: {str(exc)}",
        )


# =============================================================================
# 10. Celery Worker and Queue Health
# =============================================================================

@router.get(
    "/worker-status",
    response_model=CeleryWorkerResponse,
    summary="Celery worker nodes and queue depths (embeddings, RAG, ingestion)",
)
async def get_worker_status(
    _: User = Depends(require_admin),
) -> CeleryWorkerResponse:
    """
    Worker status for an all-PostgreSQL stack (no Redis).

    Queue depths: queried from `kombu_message` (SQLAlchemy transport table).
    Worker detection: Celery inspect with pgrep fallback (inspect is unreliable
    over the PostgreSQL transport — workers run but don't reply to inspect pings
    on the control channel within the timeout window).
    """
    try:
        from app.services.background.celery_app import celery_app

        # ── 1. Celery inspect (best-effort — often silent on PG transport) ────
        active: dict = {}
        stats: dict = {}
        try:
            inspect = celery_app.control.inspect(timeout=3.0)
            active = inspect.active() or {}
            stats  = inspect.stats()  or {}
        except Exception as insp_exc:
            logger.debug("Celery inspect timed out (PG transport): %s", insp_exc)

        # ── 2. Queue depths via kombu_message (PostgreSQL/sqla+ transport) ───
        # kombu SQLAlchemy transport schema:
        #   developer_schema.kombu_message  (id, visible, queue_id, payload, ...)
        #   developer_schema.kombu_queue    (id, name)
        # Queue name must be resolved via JOIN — no direct 'queue' column.
        queues_to_check = ["celery", "default", "documents", "rag", "embeddings", "ingestion", "ocr"]
        queue_depths: dict[str, int] = {q: -1 for q in queues_to_check}
        try:
            from app.db.session import SessionLocal
            from sqlalchemy import text as sql_text
            with SessionLocal() as sess:
                rows = sess.execute(sql_text("""
                    SELECT kq.name AS queue_name, COUNT(*) AS depth
                    FROM developer_schema.kombu_message km
                    JOIN developer_schema.kombu_queue kq ON kq.id = km.queue_id
                    WHERE km.visible = true
                    GROUP BY kq.name
                """)).fetchall()
                # Reset all known queues to 0 once we know the table is reachable
                for q in queues_to_check:
                    queue_depths[q] = 0
                for row in rows:
                    # Include queues even if not in the watch-list (dynamic discovery)
                    queue_depths[row[0]] = int(row[1])
        except Exception as sql_exc:
            # Schema not found or transport mismatch — leave as -1 (unknown)
            logger.debug("kombu_message depth query failed: %s", sql_exc)

        # ── 3. pgrep fallback — detect workers even when inspect is silent ────
        # The PostgreSQL transport's control channel is slow; workers exist but
        # don't reply to inspect.active() within the 3s window. pgrep is fast
        # and always accurate — use it whenever inspect returns nothing.
        if not stats:
            import subprocess
            try:
                proc = subprocess.run(
                    ["pgrep", "-fa", "celery"],
                    capture_output=True, text=True, timeout=3,
                )
                worker_lines = [
                    line for line in proc.stdout.splitlines()
                    if "worker" in line
                    and "ForkPoolWorker" not in line
                    and "pgrep" not in line
                    and "tail" not in line
                ]
                for line in worker_lines:
                    parts = line.split()
                    pid = parts[0]
                    name = f"celery@pid-{pid}"
                    for i, p in enumerate(parts):
                        if p == "-n" and i + 1 < len(parts):
                            name = parts[i + 1]
                            # Make names unique if multiple procs share the same -n argument
                            name = f"{name}_{pid}"
                            break
                        elif p.startswith("--hostname="):
                            name = p.split("=", 1)[1]
                            name = f"{name}_{pid}"
                            break
                    active.setdefault(name, [])
                    stats.setdefault(name, {})
            except Exception as pg_exc:
                logger.debug("pgrep fallback failed: %s", pg_exc)

        return CeleryWorkerResponse(
            active_workers=list(active.keys()),
            worker_count=len(stats),
            queue_depths=queue_depths,
            total_active_tasks=sum(len(tasks) for tasks in active.values()),
        )
    except Exception as exc:
        logger.error("Worker status check failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Could not reach Celery: {str(exc)}",
        )


# =============================================================================
# 11. User Management (Primary — paginated, with storage footprint)
# =============================================================================

@router.get(
    "/users",
    response_model=UserListResponse,
    summary="Paginated user directory with storage footprint per user",
)
async def list_users(
    page: int = 1,
    page_size: int = 25,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> UserListResponse:
    offset = (page - 1) * page_size

    count_result = await db.execute(text("SELECT count(*) FROM users"))
    total = count_result.scalar() or 0

    result = await db.execute(text("""
        SELECT
            u.id,
            u.email,
            u.full_name,
            u.is_active,
            u.is_admin,
            u.created_at,
            u.last_login,
            COALESCE(SUM(d.file_size), 0)                    AS total_storage_bytes,
            pg_size_pretty(COALESCE(SUM(d.file_size), 0))    AS total_storage_human,
            COUNT(DISTINCT d.id)                              AS document_count
        FROM users u
        LEFT JOIN documents d
            ON d.user_id = u.id
           AND d.deleted_at IS NULL
        GROUP BY u.id, u.email, u.full_name, u.is_active,
                 u.is_admin, u.created_at, u.last_login
        ORDER BY u.created_at DESC
        LIMIT :limit OFFSET :offset
    """), {"limit": page_size, "offset": offset})

    users = [AdminUserRow(**dict(r._mapping)) for r in result.fetchall()]

    return UserListResponse(
        users=users,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.patch(
    "/users/{user_id}/suspend",
    summary="Suspend a user account (sets is_active = false)",
)
async def suspend_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
) -> dict[str, Any]:
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot suspend your own account.",
        )
    await db.execute(
        text("UPDATE users SET is_active = false WHERE id = :id"),
        {"id": user_id},
    )
    await db.commit()
    return {"user_id": user_id, "is_active": False}


@router.patch(
    "/users/{user_id}/reinstate",
    summary="Reinstate a suspended user account (sets is_active = true)",
)
async def reinstate_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict[str, Any]:
    await db.execute(
        text("UPDATE users SET is_active = true WHERE id = :id"),
        {"id": user_id},
    )
    await db.commit()
    return {"user_id": user_id, "is_active": True}
