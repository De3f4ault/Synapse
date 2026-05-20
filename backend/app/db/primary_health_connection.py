"""
Direct asyncpg connection to the Primary for pg_stat_* infrastructure health queries.

WHY THIS EXISTS:
    Connection poolers (PgBouncer) interfere with PostgreSQL system catalog queries
    in subtle ways — pg_stat_activity reflects pooler connections rather than real
    backend connections, and pg_stat_database stats are aggregated differently.

    This module provides a single, direct asyncpg connection to the Primary that
    bypasses PgBouncer entirely. It has one purpose and one purpose only:
    querying pg_stat_database, pg_stat_activity, pg_statio_user_tables, and
    pg_replication_slots for the Admin Dashboard infrastructure health panel.

    DO NOT use this connection for any other purpose. All business-logic queries
    go through get_db() (Primary writer pool) or get_analytics_db() (Replica).

CONNECTION STRATEGY:
    No connection pool — a single connection created on demand, used, then closed.
    Admin health checks are infrequent (polled every 30s by the frontend) and must
    not consume pool slots that live student requests need.
"""

import asyncpg
import logging
from typing import AsyncGenerator

from app.core.config import settings

logger = logging.getLogger(__name__)


def _get_primary_direct_dsn() -> str:
    """
    Convert the asyncpg DATABASE_URL to a raw asyncpg DSN.

    asyncpg.connect() takes a plain postgresql:// DSN, not the
    SQLAlchemy postgresql+asyncpg:// format.
    """
    url = settings.DATABASE_URL
    # Strip SQLAlchemy driver prefix if present
    if url.startswith("postgresql+asyncpg://"):
        return url.replace("postgresql+asyncpg://", "postgresql://")
    return url


async def get_primary_health_db() -> AsyncGenerator[asyncpg.Connection, None]:
    """
    FastAPI dependency: provides a direct asyncpg connection to the Primary.

    Used exclusively for pg_stat_* and pg_replication_slots queries in the
    Admin Dashboard infrastructure health endpoints. Never used for writes
    or for any business-logic query.

    Creates a fresh connection on every request and closes it immediately
    after — no pooling, no connection reuse.

    Usage:
        @router.get("/admin/db-health")
        async def get_db_health(conn: asyncpg.Connection = Depends(get_primary_health_db)):
            row = await conn.fetchrow("SELECT pg_database_size(current_database())")
            ...
    """
    dsn = _get_primary_direct_dsn()
    conn: asyncpg.Connection = await asyncpg.connect(dsn)
    try:
        # Set search_path immediately — bypassing PgBouncer means no pool event fires
        await conn.execute(f"SET search_path TO {settings.DATABASE_SCHEMA}, public")
        yield conn
    finally:
        await conn.close()
