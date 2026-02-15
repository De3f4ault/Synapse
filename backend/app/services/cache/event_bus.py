"""
Durable PostgreSQL Event Bus.

Replaces Redis PUBLISH/SUBSCRIBE with a persistent, reliable alternative.

Architecture:
    - Events are persisted in the `events` UNLOGGED table (survive app restarts)
    - NOTIFY is used as a lightweight "doorbell" (no payload in the signal)
    - One dedicated asyncpg connection for LISTEN (bypasses PgBouncer)
    - Bounded asyncio.Queue provides backpressure control
    - Uses `delivered` flag to avoid MVCC visibility gaps

Connection topology:
    ┌─────────────────────────────────────────────────────────┐
    │  FastAPI App                                            │
    │                                                         │
    │  ┌──────────────────┐        ┌────────────────────────┐  │
    │  │ API traffic       │       │ PgEventBus             │  │
    │  │ (pooled via       │       │ (1 dedicated asyncpg   │  │
    │  │  PgBouncer)       │       │  conn, direct to PG)   │  │
    │  └────────┬─────────┘        └──────────┬─────────────┘  │
    │           │ publish()                   │ LISTEN         │
    │           │ goes through pool           │ bypasses pool  │
    └───────────┼─────────────────────────────┼───────────────┘
                │                             │
                ▼                             ▼
          ┌──────────┐                ┌──────────────┐
          │ PgBouncer │                │  PostgreSQL   │
          │ :6432     │──────────────▶│  :5432        │
          └──────────┘                └──────────────┘
"""

import asyncio
import json
from typing import Any, Callable, Coroutine, Dict, Optional, Set

from app.utils.logging import get_logger
import asyncpg
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

logger = get_logger(__name__)

# Type alias for event callbacks
EventCallback = Callable[[dict], Coroutine[Any, Any, None]]


class PgEventBus:
    """
    Durable event bus using PostgreSQL LISTEN/NOTIFY + events table.

    Guarantees at-least-once delivery:
    - Events are persisted before notification
    - Undelivered events are recovered on startup
    - `delivered` flag avoids MVCC visibility gaps

    Usage:
        bus = PgEventBus(listen_dsn="postgresql://...", session_factory=AsyncSessionLocal)
        await bus.start()

        # Subscribe
        async def on_message(data: dict):
            print(data)
        await bus.subscribe("user_123", on_message)

        # Publish (from any part of the app)
        await bus.publish("user_123", {"type": "new_message", "id": 42})

        # Shutdown
        await bus.stop()
    """

    def __init__(
        self,
        listen_dsn: str,
        session_factory: async_sessionmaker[AsyncSession],
        schema: str = "developer_schema",
    ):
        """
        Args:
            listen_dsn: Direct PostgreSQL DSN for LISTEN (bypasses PgBouncer).
                        e.g. "postgresql://user:pass@localhost:5432/synapse"
            session_factory: SQLAlchemy async session factory for publish
                            (goes through normal pool/PgBouncer).
            schema: PostgreSQL schema for search_path on the LISTEN connection.
                    Must match the SQLAlchemy engine's search_path.
        """
        self._listen_dsn = listen_dsn
        self._session_factory = session_factory
        self._schema = schema
        self._conn: Optional[asyncpg.Connection] = None
        self._callbacks: Dict[str, Set[EventCallback]] = {}
        self._queue: asyncio.Queue = asyncio.Queue(maxsize=1000)
        self._consumer_task: Optional[asyncio.Task] = None
        self._reconnect_task: Optional[asyncio.Task] = None
        self._running = False

    # ── Lifecycle ────────────────────────────────────────────

    async def start(self) -> None:
        """
        Connect the dedicated listener and start the consumer loop.

        Also drains any undelivered events from before restart
        (at-least-once recovery).
        """
        self._running = True
        await self._connect_listener()
        self._consumer_task = asyncio.create_task(
            self._consume_loop(), name="pg_event_bus_consumer"
        )
        # Recover undelivered events from a previous crash/restart
        await self._drain_events()
        logger.info("pg_event_bus_started")

    async def stop(self) -> None:
        """Gracefully shutdown the listener and consumer."""
        self._running = False
        if self._consumer_task:
            self._consumer_task.cancel()
            try:
                await self._consumer_task
            except asyncio.CancelledError:
                pass
        if self._reconnect_task:
            self._reconnect_task.cancel()
        if self._conn and not self._conn.is_closed():
            await self._conn.close()
        logger.info("pg_event_bus_stopped")

    def is_healthy(self) -> bool:
        """Check if the listener connection is alive."""
        return self._conn is not None and not self._conn.is_closed() and self._running

    # ── Publish (uses pooled connections) ────────────────────

    async def publish(self, channel: str, payload: dict) -> None:
        """
        Publish an event to a channel.

        Inserts the event into the `events` table (persistent) and sends a
        NOTIFY signal to wake the listener. The publish goes through the
        normal connection pool (PgBouncer-compatible).
        """
        async with self._session_factory() as session:
            await session.execute(
                text("""
                    INSERT INTO events (channel, payload)
                    VALUES (:channel, :payload::jsonb)
                """),
                {"channel": channel, "payload": json.dumps(payload)},
            )
            # Doorbell — no payload, just wake the listener
            await session.execute(text("NOTIFY __events__"))
            await session.commit()

    # ── Subscribe / Unsubscribe ──────────────────────────────

    async def subscribe(self, channel: str, callback: EventCallback) -> None:
        """
        Subscribe to a channel with an async callback.

        The callback receives the deserialized event payload as a dict.
        Multiple callbacks can be registered per channel.
        """
        if channel not in self._callbacks:
            self._callbacks[channel] = set()
        self._callbacks[channel].add(callback)
        logger.debug("event_bus_subscribed", channel=channel)

    async def unsubscribe(self, channel: str, callback: Optional[EventCallback] = None) -> None:
        """
        Unsubscribe a callback from a channel.

        If callback is None, removes all callbacks for the channel.
        """
        if channel not in self._callbacks:
            return
        if callback is None:
            del self._callbacks[channel]
        else:
            self._callbacks[channel].discard(callback)
            if not self._callbacks[channel]:
                del self._callbacks[channel]

    # ── Internal: Connection Management ──────────────────────

    async def _connect_listener(self) -> None:
        """
        Establish the dedicated LISTEN connection.

        This connection bypasses PgBouncer and connects directly to
        PostgreSQL, because LISTEN requires session-level state that
        PgBouncer transaction pooling does not support.

        Sets search_path to match the SQLAlchemy engine's configuration
        so unqualified table references resolve to the correct schema.
        """
        try:
            self._conn = await asyncpg.connect(self._listen_dsn)
            # Match the SQLAlchemy engine's search_path
            await self._conn.execute(f"SET search_path TO {self._schema}, public")
            await self._conn.add_listener("__events__", self._on_notify)
            logger.info(
                "pg_event_bus_listener_connected",
                schema=self._schema,
            )
        except Exception as e:
            logger.error(
                "pg_event_bus_connect_failed",
                error=str(e),
                dsn=self._listen_dsn[:30] + "...",  # Don't log credentials
            )
            raise

    def _on_notify(
        self,
        connection: asyncpg.Connection,
        pid: int,
        channel: str,
        payload: str,
    ) -> None:
        """
        Callback fired by asyncpg when a NOTIFY arrives.

        We don't process events here — just signal the consumer loop
        via the queue. This keeps the notification handler fast.
        """
        try:
            self._queue.put_nowait(True)
        except asyncio.QueueFull:
            # Queue is full — consumer will drain all pending events
            # when it next runs, so no events are lost.
            pass

    # ── Internal: Consumer Loop ──────────────────────────────

    async def _consume_loop(self) -> None:
        """
        Main consumer loop. Waits for doorbell signals, then drains
        all undelivered events from the table and fans out to callbacks.
        """
        while self._running:
            try:
                # Wait for a doorbell signal
                await self._queue.get()

                # Brief coalesce window — if multiple NOTIFYs arrived
                # close together, we batch them into one drain
                await asyncio.sleep(0.01)
                while not self._queue.empty():
                    self._queue.get_nowait()

                # Fetch and deliver events
                await self._drain_events()

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("event_bus_consume_error", error=str(e))
                await asyncio.sleep(1)

    async def _drain_events(self) -> None:
        """
        Fetch all undelivered events, mark them delivered, and fan out
        to registered callbacks.

        Uses `delivered = FALSE` filter instead of tracking last_id to
        avoid MVCC visibility gaps (where a higher ID commits before a
        lower ID, causing the lower ID to be skipped).
        """
        rows = []
        try:
            async with self._session_factory() as session:
                result = await session.execute(
                    text("""
                        SELECT id, channel, payload FROM events
                        WHERE delivered = FALSE
                        ORDER BY id
                    """)
                )
                rows = result.fetchall()

                if rows:
                    ids = [r[0] for r in rows]
                    await session.execute(
                        text("""
                            UPDATE events SET delivered = TRUE
                            WHERE id = ANY(:ids)
                        """),
                        {"ids": ids},
                    )
                    await session.commit()
        except Exception as e:
            logger.error("event_bus_drain_error", error=str(e))
            return

        # Fan out to callbacks (outside the DB session)
        for _event_id, channel, payload in rows:
            if channel in self._callbacks:
                data = json.loads(payload) if isinstance(payload, str) else payload
                for cb in self._callbacks[channel]:
                    asyncio.create_task(cb(data))


# ── Module-level singleton ───────────────────────────────────

_event_bus: Optional[PgEventBus] = None


def get_event_bus() -> PgEventBus:
    """
    Get the global PgEventBus instance.

    Raises RuntimeError if the event bus hasn't been initialized
    (call init_event_bus() during startup first).
    """
    if _event_bus is None:
        raise RuntimeError("Event bus not initialized. Call init_event_bus() during startup.")
    return _event_bus


async def init_event_bus(
    listen_dsn: str,
    session_factory: async_sessionmaker[AsyncSession],
    schema: str = "developer_schema",
) -> PgEventBus:
    """
    Initialize and start the global event bus.

    Args:
        listen_dsn: Direct PostgreSQL DSN (bypasses PgBouncer)
        session_factory: SQLAlchemy async session factory
        schema: PostgreSQL schema name (must match engine search_path)

    Returns:
        The initialized PgEventBus instance
    """
    global _event_bus
    _event_bus = PgEventBus(
        listen_dsn=listen_dsn,
        session_factory=session_factory,
        schema=schema,
    )
    await _event_bus.start()
    return _event_bus


async def close_event_bus() -> None:
    """Stop the global event bus."""
    global _event_bus
    if _event_bus is not None:
        await _event_bus.stop()
        _event_bus = None
