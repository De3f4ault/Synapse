"""
Generation Runtime — Active generation tracking and control.

Manages the lifecycle of in-flight generations:
- Tracks active generations by channel
- Enables cancellation via channel lookup
- Prevents resource leaks

Channel format: "chat:{session_id}:{message_id}"
"""

import asyncio
from typing import Dict, Optional
from datetime import datetime
import structlog

from app.core.ai.cancellation import CancellationToken

logger = structlog.get_logger(__name__)


class GenerationRegistry:
    """
    Registry of active generations.

    Thread-safe via asyncio.Lock.
    Singleton pattern recommended.

    Usage:
        registry = GenerationRegistry()

        # Start generation
        token = registry.start("chat:123:456")

        # Cancel from another task
        await registry.cancel("chat:123:456")

        # Complete/cleanup
        await registry.complete("chat:123:456")
    """

    def __init__(self) -> None:
        self._generations: Dict[str, CancellationToken] = {}
        self._lock = asyncio.Lock()
        self._started_at: Dict[str, datetime] = {}

    async def start(self, channel: str) -> CancellationToken:
        """
        Register a new generation.

        If a generation already exists for this channel,
        it will be cancelled first (prevent duplicates).

        Args:
            channel: Unique identifier (e.g., "chat:123:456")

        Returns:
            CancellationToken for this generation
        """
        async with self._lock:
            # Cancel existing if any (prevent race conditions)
            existing = self._generations.get(channel)
            if existing:
                logger.warning(
                    "cancelling_existing_generation",
                    channel=channel,
                    reason="duplicate_start",
                )
                existing.cancel("superseded")

            token = CancellationToken(context=channel)
            self._generations[channel] = token
            self._started_at[channel] = datetime.utcnow()

            logger.info("generation_started", channel=channel)
            return token

    async def cancel(self, channel: str, reason: str = "user_requested") -> bool:
        """
        Cancel a generation by channel.

        Args:
            channel: Channel to cancel
            reason: Why cancellation was requested

        Returns:
            True if generation was found and cancelled, False otherwise
        """
        async with self._lock:
            token = self._generations.get(channel)
            if token:
                token.cancel(reason)
                logger.info(
                    "generation_cancelled",
                    channel=channel,
                    reason=reason,
                )
                return True
            else:
                logger.warning(
                    "generation_cancel_not_found",
                    channel=channel,
                )
                return False

    async def complete(self, channel: str, status: str = "completed") -> Optional[float]:
        """
        Mark a generation as complete and remove from registry.

        Args:
            channel: Channel to complete
            status: Completion status (completed, cancelled, errored)

        Returns:
            Duration in seconds, or None if not found
        """
        async with self._lock:
            token = self._generations.pop(channel, None)
            started = self._started_at.pop(channel, None)

            if token and started:
                duration = (datetime.utcnow() - started).total_seconds()
                logger.info(
                    "generation_completed",
                    channel=channel,
                    status=status,
                    duration_seconds=round(duration, 2),
                    was_cancelled=token.is_cancelled,
                )
                return duration
            return None

    def get(self, channel: str) -> Optional[CancellationToken]:
        """Get token for a channel (no lock, read-only snapshot)."""
        return self._generations.get(channel)

    def is_active(self, channel: str) -> bool:
        """Check if a generation is active."""
        token = self._generations.get(channel)
        return token is not None and not token.is_cancelled

    @property
    def active_count(self) -> int:
        """Number of active generations."""
        return len(self._generations)

    def active_channels(self) -> list[str]:
        """List of active channel identifiers."""
        return list(self._generations.keys())


# Singleton instance
_registry: Optional[GenerationRegistry] = None


def get_generation_registry() -> GenerationRegistry:
    """Get the global generation registry singleton."""
    global _registry
    if _registry is None:
        _registry = GenerationRegistry()
    return _registry
