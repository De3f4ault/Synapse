"""
PostgreSQL-backed cache client.

Drop-in replacement for the Redis CacheClient.
Uses the kv_store UNLOGGED table for all KV operations.
All methods are async and match the original CacheClient API.
"""

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

logger = logging.getLogger(__name__)


class PgCacheClient:
    """
    PostgreSQL cache client with Redis-compatible API.

    Backed by the `kv_store` UNLOGGED table. Provides:
    - get/set/delete/exists (key-value CRUD)
    - increment (atomic counter)
    - expire/ttl (time-to-live management)
    - keys (pattern matching)
    - ping (health check)
    """

    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self._session_factory = session_factory

    # ── Core CRUD ────────────────────────────────────────────

    async def get(self, key: str, default: Any = None) -> Any:
        """Get value by key. Returns default if not found or expired."""
        async with self._session_factory() as session:
            result = await session.execute(
                text("""
                    SELECT value FROM kv_store
                    WHERE key = :key
                    AND (expires_at IS NULL OR expires_at > now())
                """),
                {"key": key},
            )
            row = result.scalar_one_or_none()
            if row is None:
                return default
            # JSONB comes back as a Python object already from asyncpg
            if isinstance(row, str):
                try:
                    return json.loads(row)
                except (json.JSONDecodeError, TypeError):
                    return row
            return row

    async def set(
        self,
        key: str,
        value: Any,
        ex: Optional[int] = None,
        ttl: Optional[int] = None,
    ) -> bool:
        """Set a key-value pair with optional TTL in seconds."""
        seconds = ex or ttl
        expires = datetime.now(timezone.utc) + timedelta(seconds=seconds) if seconds else None
        # Serialize value to JSON-compatible format
        json_value = self._serialize(value)

        async with self._session_factory() as session:
            await session.execute(
                text("""
                    INSERT INTO kv_store (key, value, expires_at)
                    VALUES (:key, :value::jsonb, :expires_at)
                    ON CONFLICT (key) DO UPDATE
                    SET value = :value::jsonb, expires_at = :expires_at
                """),
                {"key": key, "value": json_value, "expires_at": expires},
            )
            await session.commit()
            return True

    async def delete(self, *keys: str) -> int:
        """Delete one or more keys. Returns number of keys deleted."""
        if not keys:
            return 0
        async with self._session_factory() as session:
            result = await session.execute(
                text("DELETE FROM kv_store WHERE key = ANY(:keys)"),
                {"keys": list(keys)},
            )
            await session.commit()
            return result.rowcount

    async def exists(self, key: str) -> bool:
        """Check if a key exists and is not expired."""
        async with self._session_factory() as session:
            result = await session.execute(
                text("""
                    SELECT 1 FROM kv_store
                    WHERE key = :key
                    AND (expires_at IS NULL OR expires_at > now())
                """),
                {"key": key},
            )
            return result.scalar_one_or_none() is not None

    # ── Atomic Operations ────────────────────────────────────

    async def increment(self, key: str, amount: int = 1) -> int:
        """
        Atomic increment. Creates the key with value=amount if not exists.
        Returns the new value.
        """
        async with self._session_factory() as session:
            result = await session.execute(
                text("""
                    INSERT INTO kv_store (key, value, expires_at)
                    VALUES (:key, to_jsonb(:amount::int), NULL)
                    ON CONFLICT (key) DO UPDATE
                    SET value = to_jsonb((kv_store.value::text::int + :amount))
                    RETURNING (value::text::int)
                """),
                {"key": key, "amount": amount},
            )
            await session.commit()
            return result.scalar_one()

    async def decrement(self, key: str, amount: int = 1) -> int:
        """Atomic decrement. Wrapper around increment with negative amount."""
        return await self.increment(key, -amount)

    # ── TTL Management ───────────────────────────────────────

    async def expire(self, key: str, seconds: int) -> bool:
        """Set expiration on existing key. Returns True if key exists."""
        expires = datetime.now(timezone.utc) + timedelta(seconds=seconds)
        async with self._session_factory() as session:
            result = await session.execute(
                text("""
                    UPDATE kv_store SET expires_at = :expires_at
                    WHERE key = :key
                """),
                {"key": key, "expires_at": expires},
            )
            await session.commit()
            return result.rowcount > 0

    async def ttl(self, key: str) -> int:
        """
        Get remaining TTL in seconds.
        Returns -1 if key has no expiry, -2 if key doesn't exist.
        """
        async with self._session_factory() as session:
            result = await session.execute(
                text("""
                    SELECT expires_at FROM kv_store WHERE key = :key
                    AND (expires_at IS NULL OR expires_at > now())
                """),
                {"key": key},
            )
            row = result.fetchone()
            if row is None:
                return -2  # Key doesn't exist (or is expired)
            expires_at = row[0]
            if expires_at is None:
                return -1  # Key exists but has no expiry
            remaining = (expires_at - datetime.now(timezone.utc)).total_seconds()
            return max(int(remaining), 0)

    # ── Pattern Matching ─────────────────────────────────────

    async def keys(self, pattern: str) -> List[str]:
        """
        Find keys matching a pattern (supports * wildcard).
        Converts Redis glob to SQL LIKE.
        """
        sql_pattern = pattern.replace("*", "%").replace("?", "_")
        async with self._session_factory() as session:
            result = await session.execute(
                text("""
                    SELECT key FROM kv_store
                    WHERE key LIKE :pattern
                    AND (expires_at IS NULL OR expires_at > now())
                """),
                {"pattern": sql_pattern},
            )
            return [row[0] for row in result.fetchall()]

    # ── Batch Operations ─────────────────────────────────────

    async def mget(self, *keys: str) -> List[Any]:
        """Get multiple keys at once. Returns values in order, None for missing."""
        if not keys:
            return []
        key_list = list(keys)
        async with self._session_factory() as session:
            result = await session.execute(
                text("""
                    SELECT key, value FROM kv_store
                    WHERE key = ANY(:keys)
                    AND (expires_at IS NULL OR expires_at > now())
                """),
                {"keys": key_list},
            )
            found = {row[0]: row[1] for row in result.fetchall()}
            return [found.get(k) for k in key_list]

    # ── Admin ────────────────────────────────────────────────

    async def flushdb(self) -> bool:
        """Delete all keys. Use with caution."""
        async with self._session_factory() as session:
            await session.execute(text("DELETE FROM kv_store"))
            await session.commit()
            return True

    async def ping(self) -> bool:
        """Health check — verifies database connectivity."""
        try:
            async with self._session_factory() as session:
                await session.execute(text("SELECT 1"))
            return True
        except Exception:
            return False

    # ── Helpers ───────────────────────────────────────────────

    @staticmethod
    def _serialize(value: Any) -> str:
        """Convert a Python value to a JSON string for JSONB storage."""
        if isinstance(value, str):
            return json.dumps(value)
        if isinstance(value, (int, float, bool)):
            return json.dumps(value)
        if isinstance(value, (dict, list)):
            return json.dumps(value)
        if value is None:
            return "null"
        # Fallback: try JSON, then str
        try:
            return json.dumps(value)
        except (TypeError, ValueError):
            return json.dumps(str(value))
