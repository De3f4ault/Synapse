"""
Cancellation Token — First-class cancellation primitive.

PRINCIPLE: Cancellation is not an error. It is a first-class outcome.

This module provides cooperative cancellation for async operations.
Used for generation abort when user clicks "Stop".

Key properties:
- Thread-safe
- Awaitable checkpoint
- Clean exception propagation
- Observable state
"""

import asyncio
from typing import Optional
from datetime import datetime


class GenerationCancelled(Exception):
    """
    Raised when user explicitly cancels generation.

    This is NOT an error. It's user intent.
    Handle gracefully - preserve partial output, clean up resources.
    """

    def __init__(self, message: str = "Generation cancelled by user"):
        self.message = message
        self.cancelled_at = datetime.utcnow()
        super().__init__(self.message)


class CancellationToken:
    """
    Cooperative cancellation token for async operations.

    Usage:
        token = CancellationToken()

        # In generation loop:
        async for chunk in stream:
            await token.checkpoint()  # Raises if cancelled
            yield chunk

        # To cancel (from another task):
        token.cancel()

    Properties:
        - is_cancelled: Check if cancellation was requested
        - checkpoint(): Await to raise if cancelled
        - cancel(): Request cancellation (idempotent)
    """

    def __init__(self, context: Optional[str] = None) -> None:
        """
        Args:
            context: Optional context string for debugging (e.g., "chat:123:456")
        """
        self._event = asyncio.Event()
        self._context = context
        self._cancelled_at: Optional[datetime] = None
        self._reason: Optional[str] = None

    def cancel(self, reason: str = "user_requested") -> None:
        """
        Request cancellation.

        Idempotent - safe to call multiple times.

        Args:
            reason: Why cancellation was requested
        """
        if not self._event.is_set():
            self._cancelled_at = datetime.utcnow()
            self._reason = reason
            self._event.set()

    @property
    def is_cancelled(self) -> bool:
        """Check if cancellation was requested."""
        return self._event.is_set()

    @property
    def cancelled_at(self) -> Optional[datetime]:
        """When cancellation was requested, if at all."""
        return self._cancelled_at

    @property
    def reason(self) -> Optional[str]:
        """Why cancellation was requested."""
        return self._reason

    @property
    def context(self) -> Optional[str]:
        """Context string for debugging."""
        return self._context

    async def checkpoint(self) -> None:
        """
        Await at yield points to check for cancellation.

        Raises:
            GenerationCancelled: If cancellation was requested

        Usage:
            async for chunk in stream:
                await token.checkpoint()
                yield chunk
        """
        if self._event.is_set():
            raise GenerationCancelled(f"Generation cancelled: {self._reason or 'unknown reason'}")

    async def wait_for_cancellation(self) -> None:
        """
        Block until cancellation is requested.

        Useful for cleanup tasks that should run on cancel.
        """
        await self._event.wait()

    def __repr__(self) -> str:
        status = "cancelled" if self.is_cancelled else "active"
        return f"<CancellationToken({self._context}) {status}>"
