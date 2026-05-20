"""
Admin data retention tasks for the Synapse Admin Dashboard.

TASK:
    purge_old_agent_metrics — enforces 90-day retention on agent_metrics.

WHY THIS EXISTS:
    agent_metrics was UNLOGGED (ephemeral, wiped on restart) and therefore had
    no retention concern — data was self-limiting. After converting to LOGGED
    for the Admin Dashboard, the table participates in WAL and replicates to the
    Logical Replica. Without a retention policy it will grow indefinitely.

    90 days provides sufficient trend data for the AgentPerformance dashboard
    panel (ReAct loop analysis, failure rate trends) while keeping the table lean.

BATCH STRATEGY:
    Deletes in batches of 10,000 rows to avoid long-running table locks.
    A single unbatched DELETE across 90 days of agent rows could lock the table
    for the full duration of the delete — unacceptable on a live platform.
    Each batch is committed immediately, releasing locks between iterations.

SCHEDULE:
    Weekly, Sunday at 02:00 UTC via Celery Beat.
    Low-traffic window minimises impact of the write-amplification from DELETE + WAL.
"""

import logging
from celery import shared_task
from sqlalchemy import text

logger = logging.getLogger(__name__)


@shared_task(
    name="admin.purge_agent_metrics_retention",
    queue="default",
    max_retries=3,
    default_retry_delay=300,  # 5 minutes between retries
    soft_time_limit=3600,     # 1 hour soft limit (large tables may take time)
    time_limit=7200,          # 2 hour hard limit
)
def purge_old_agent_metrics() -> dict:
    """
    Enforce 90-day retention on agent_metrics table.

    Deletes rows older than 90 days in batches of 10,000.
    Runs weekly on Sunday at 02:00 UTC.

    Returns:
        dict: {"rows_purged": int, "batches": int}
    """
    from app.db.session import SessionLocal

    total_purged = 0
    batches = 0

    logger.info("admin.purge_agent_metrics: starting 90-day retention sweep")

    try:
        with SessionLocal() as db:
            while True:
                result = db.execute(text("""
                    DELETE FROM agent_metrics
                    WHERE id IN (
                        SELECT id FROM agent_metrics
                        WHERE created_at < now() - interval '90 days'
                        ORDER BY id
                        LIMIT 10000
                    )
                """))
                db.commit()

                batch_count = result.rowcount
                total_purged += batch_count
                batches += 1

                if batch_count == 0:
                    break

                logger.info(
                    "admin.purge_agent_metrics: batch %d complete, %d rows deleted",
                    batches,
                    batch_count,
                )

    except Exception as exc:
        logger.error(
            "admin.purge_agent_metrics: failed after %d rows in %d batches: %s",
            total_purged,
            batches,
            str(exc),
        )
        raise

    logger.info(
        "admin.purge_agent_metrics: complete. %d rows purged in %d batches.",
        total_purged,
        batches,
    )
    return {"rows_purged": total_purged, "batches": batches}
