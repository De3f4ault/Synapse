"""
Quota Check Middleware - Prevent API quota exhaustion

Checks Gemini API quotas before agent execution:
- RPM (Requests Per Minute)
- TPM (Tokens Per Minute)
- RPD (Requests Per Day)

If quota exceeded:
- Waits for quota reset
- Falls back to cheaper model
- Raises QuotaExceededError

Based on production best practices for API quota management.
"""

from typing import Dict, Any, Optional, List
import asyncio
import structlog

logger = structlog.get_logger(__name__)


class QuotaExceededError(Exception):
    """Raised when API quota is exhausted"""
    pass


class QuotaCheckMiddleware:
    """
    Check Gemini API quotas before execution

    Prevents quota exhaustion by:
    1. Checking current quota status
    2. Waiting if temporary limit hit
    3. Failing fast if daily limit hit
    4. Auto-downgrading to cheaper model

    Usage:
        middleware = QuotaCheckMiddleware()

        agent = BaseAgent(
            config=AgentConfig(
                ...,
                middleware=[middleware]
            )
        )
    """

    def __init__(
        self,
        quota_manager: Optional[Any] = None,
        wait_on_rate_limit: bool = True,
        max_wait_seconds: int = 60,
        auto_downgrade: bool = True,
        fallback_chain: Optional[List[str]] = None
    ):
        """
        Initialize middleware

        Args:
            quota_manager: QuotaManager instance (injected)
            wait_on_rate_limit: Wait if rate limit hit
            max_wait_seconds: Max wait time for quota reset
            auto_downgrade: Downgrade to cheaper model on quota hit
            fallback_chain: Model fallback sequence
        """
        self.quota_manager = quota_manager
        self.wait_on_rate_limit = wait_on_rate_limit
        self.max_wait_seconds = max_wait_seconds
        self.auto_downgrade = auto_downgrade
        self.fallback_chain = fallback_chain or [
            "gemini-2.5-pro",
            "gemini-2.5-flash",
            "gemini-2.5-flash-8b"
        ]
        self.logger = logger.bind(middleware="quota_check")

    async def before_execution(
        self,
        agent: Any,
        state: Any,
        context: Dict[str, Any],
        user_id: int
    ) -> None:
        """
        Check quotas before agent execution

        Args:
            agent: Agent instance
            state: Agent state
            context: Current context
            user_id: User ID

        Raises:
            QuotaExceededError: If quota exhausted and can't proceed
        """
        self.logger.info(
            "quota_check_started",
            agent=agent.name,
            model=agent.config.model,
            user_id=user_id
        )

        try:
            # ================================================================
            # GET QUOTA MANAGER
            # ================================================================
            if self.quota_manager is None:
                from app.core.ai.quota_manager import get_quota_manager
                self.quota_manager = get_quota_manager()

            # ================================================================
            # CHECK QUOTA
            # ================================================================
            model = agent.config.model
            has_quota = await self.quota_manager.check_quota(model)

            if has_quota:
                # All good!
                self.logger.debug("quota_check_passed", model=model)
                return

            # ================================================================
            # QUOTA EXCEEDED - HANDLE IT
            # ================================================================
            self.logger.warning(
                "quota_exceeded",
                model=model,
                user_id=user_id
            )

            # Get quota status for details
            status = await self.quota_manager.get_quota_status(model)

            # Check if it's a rate limit (temporary) or daily limit (permanent)
            rpm_exhausted = status.get("rpm_remaining", 1) == 0
            rpd_exhausted = status.get("rpd_remaining", 1) == 0

            if rpd_exhausted:
                # Daily limit hit - can't wait, must fail or fallback
                await self._handle_daily_limit(agent, state, context)
            elif rpm_exhausted and self.wait_on_rate_limit:
                # Rate limit - wait for reset
                await self._handle_rate_limit(agent, state, context, status)
            else:
                # Can't proceed
                raise QuotaExceededError(
                    f"Quota exceeded for {model}. "
                    f"RPM: {status.get('rpm_remaining', 0)}, "
                    f"RPD: {status.get('rpd_remaining', 0)}"
                )

        except QuotaExceededError:
            raise  # Re-raise
        except Exception as e:
            self.logger.error(
                "quota_check_failed",
                agent=agent.name,
                error=str(e)
            )
            # Don't fail agent on quota check errors - let it proceed

    async def after_execution(
        self,
        agent: Any,
        state: Any,
        context: Dict[str, Any],
        user_id: int
    ) -> None:
        """
        Post-execution hook - track quota usage

        Args:
            agent: Agent instance
            state: Agent state
            context: Current context
            user_id: User ID
        """
        if self.quota_manager is None:
            return

        # Increment quota counters
        model = agent.config.model
        tokens_used = state.metadata.get("tokens_used", 0)

        await self.quota_manager.increment(model, tokens_used)

        self.logger.debug(
            "quota_incremented",
            model=model,
            tokens=tokens_used
        )

    async def _handle_daily_limit(
        self,
        agent: Any,
        state: Any,
        context: Dict[str, Any]
    ) -> None:
        """
        Handle daily quota exhaustion

        Options:
        1. Auto-downgrade to cheaper model
        2. Fail with QuotaExceededError

        Args:
            agent: Agent instance
            state: Agent state
            context: Current context
        """
        if not self.auto_downgrade:
            raise QuotaExceededError(
                f"Daily quota exhausted for {agent.config.model}"
            )

        # Try fallback chain
        current_model = agent.config.model
        current_index = (
            self.fallback_chain.index(current_model)
            if current_model in self.fallback_chain
            else -1
        )

        # Get next cheaper model
        if current_index < len(self.fallback_chain) - 1:
            fallback_model = self.fallback_chain[current_index + 1]

            # Check if fallback has quota
            has_quota = await self.quota_manager.check_quota(fallback_model)

            if has_quota:
                # Downgrade!
                agent.config.model = fallback_model
                state.metadata["model_downgraded"] = True
                state.metadata["original_model"] = current_model
                state.metadata["fallback_model"] = fallback_model

                self.logger.warning(
                    "model_downgraded",
                    from_model=current_model,
                    to_model=fallback_model,
                    reason="daily_quota_exhausted"
                )
                return

        # No fallback available
        raise QuotaExceededError(
            f"Daily quota exhausted for {current_model} and all fallbacks"
        )

    async def _handle_rate_limit(
        self,
        agent: Any,
        state: Any,
        context: Dict[str, Any],
        status: Dict[str, Any]
    ) -> None:
        """
        Handle rate limit (temporary)

        Waits for quota reset (up to max_wait_seconds)

        Args:
            agent: Agent instance
            state: Agent state
            context: Current context
            status: Quota status
        """
        reset_in_seconds = status.get("reset_in_seconds", 60)

        if reset_in_seconds > self.max_wait_seconds:
            raise QuotaExceededError(
                f"Rate limit hit, reset in {reset_in_seconds}s "
                f"(exceeds max wait of {self.max_wait_seconds}s)"
            )

        self.logger.info(
            "rate_limit_wait",
            model=agent.config.model,
            wait_seconds=reset_in_seconds
        )

        state.metadata["rate_limit_wait"] = reset_in_seconds

        # Wait for reset
        await asyncio.sleep(reset_in_seconds)

        self.logger.info(
            "rate_limit_wait_complete",
            model=agent.config.model
        )


# Convenience function
def quota_check_middleware(**kwargs) -> QuotaCheckMiddleware:
    """
    Create quota check middleware

    Args:
        **kwargs: Configuration options

    Returns:
        Configured middleware

    Example:
        middleware = quota_check_middleware(
            wait_on_rate_limit=True,
            auto_downgrade=True
        )
    """
    return QuotaCheckMiddleware(**kwargs)
