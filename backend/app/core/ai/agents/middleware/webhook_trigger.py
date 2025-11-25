"""
Webhook Trigger Middleware - Event broadcasting

Triggers webhooks on agent events:
- agent.execution.started
- agent.execution.completed
- agent.execution.failed
- agent.tool.called

Enables external systems to react to agent activity in real-time.

Based on event-driven architecture best practices.
"""

from typing import Dict, Any, Optional
import structlog

logger = structlog.get_logger(__name__)


class WebhookTriggerMiddleware:
    """
    Trigger webhooks on agent lifecycle events

    Automatically broadcasts:
    - Execution start/complete/failure
    - Tool usage
    - Performance metrics

    Usage:
        middleware = WebhookTriggerMiddleware()

        agent = BaseAgent(
            config=AgentConfig(
                ...,
                middleware=[middleware]
            )
        )
    """

    def __init__(
        self,
        event_dispatcher: Optional[Any] = None,
        trigger_on_start: bool = True,
        trigger_on_complete: bool = True,
        trigger_on_failure: bool = True,
        trigger_on_tool_calls: bool = False,  # Can be noisy
        include_full_output: bool = False  # Privacy consideration
    ):
        """
        Initialize middleware

        Args:
            event_dispatcher: EventDispatcher instance (injected)
            trigger_on_start: Emit event on execution start
            trigger_on_complete: Emit event on completion
            trigger_on_failure: Emit event on failure
            trigger_on_tool_calls: Emit event per tool call
            include_full_output: Include full agent output in event
        """
        self.event_dispatcher = event_dispatcher
        self.trigger_on_start = trigger_on_start
        self.trigger_on_complete = trigger_on_complete
        self.trigger_on_failure = trigger_on_failure
        self.trigger_on_tool_calls = trigger_on_tool_calls
        self.include_full_output = include_full_output
        self.logger = logger.bind(middleware="webhook_trigger")

    async def before_execution(
        self,
        agent: Any,
        state: Any,
        context: Dict[str, Any],
        user_id: int
    ) -> None:
        """
        Trigger webhook on execution start

        Args:
            agent: Agent instance
            state: Agent state
            context: Current context
            user_id: User ID
        """
        if not self.trigger_on_start:
            return

        try:
            # Get event dispatcher
            if self.event_dispatcher is None:
                from app.core.events.dispatcher import get_event_dispatcher
                self.event_dispatcher = get_event_dispatcher()

            # Build event
            from app.core.events.triggers import Event, EventType
            from datetime import datetime
            from uuid import uuid4

            event = Event(
                type=EventType.AGENT_EXECUTION_STARTED,
                user_id=user_id,
                data={
                    "agent_name": agent.name,
                    "agent_display_name": agent.display_name,
                    "input_length": len(context.get("input", "")),
                    "model": agent.config.model,
                    "capabilities": [c.value for c in agent.capabilities],
                    "started_at": datetime.utcnow().isoformat()
                },
                timestamp=datetime.utcnow(),
                event_id=str(uuid4())
            )

            # Emit event
            await self.event_dispatcher.emit(event)

            self.logger.debug(
                "webhook_triggered",
                event_type="agent.execution.started",
                agent=agent.name,
                user_id=user_id
            )

        except Exception as e:
            self.logger.error(
                "webhook_trigger_failed",
                stage="before",
                error=str(e)
            )
            # Don't fail agent on webhook errors

    async def after_execution(
        self,
        agent: Any,
        state: Any,
        context: Dict[str, Any],
        user_id: int
    ) -> None:
        """
        Trigger webhook on execution complete/failure

        Args:
            agent: Agent instance
            state: Agent state
            context: Current context
            user_id: User ID
        """
        try:
            # Determine if successful or failed
            success = not state.metadata.get("error")

            if success and not self.trigger_on_complete:
                return
            if not success and not self.trigger_on_failure:
                return

            # Get event dispatcher
            if self.event_dispatcher is None:
                from app.core.events.dispatcher import get_event_dispatcher
                self.event_dispatcher = get_event_dispatcher()

            # Build event
            from app.core.events.triggers import Event, EventType
            from datetime import datetime
            from uuid import uuid4

            event_type = (
                EventType.AGENT_EXECUTION_COMPLETED
                if success
                else EventType.AGENT_EXECUTION_FAILED
            )

            event_data = {
                "agent_name": agent.name,
                "agent_display_name": agent.display_name,
                "success": success,
                "iterations": state.iterations,
                "tool_calls_count": len(state.tool_calls),
                "execution_time_ms": state.get_execution_time_ms(),
                "model": agent.config.model,
                "completed_at": datetime.utcnow().isoformat()
            }

            # Include output if configured
            if self.include_full_output and success:
                event_data["output"] = context.get("output", "")

            # Include error if failed
            if not success:
                event_data["error"] = state.metadata.get("error", "Unknown error")

            # Include tool calls summary
            if self.trigger_on_tool_calls and state.tool_calls:
                event_data["tools_used"] = [
                    tc["tool"] for tc in state.tool_calls
                ]

            # Include model downgrade info if applicable
            if state.metadata.get("model_downgraded"):
                event_data["model_downgraded"] = True
                event_data["original_model"] = state.metadata.get("original_model")
                event_data["fallback_model"] = state.metadata.get("fallback_model")

            event = Event(
                type=event_type,
                user_id=user_id,
                data=event_data,
                timestamp=datetime.utcnow(),
                event_id=str(uuid4())
            )

            # Emit event
            await self.event_dispatcher.emit(event)

            self.logger.debug(
                "webhook_triggered",
                event_type=event_type.value,
                agent=agent.name,
                user_id=user_id,
                success=success
            )

        except Exception as e:
            self.logger.error(
                "webhook_trigger_failed",
                stage="after",
                error=str(e)
            )
            # Don't fail agent on webhook errors


# Convenience function
def webhook_trigger_middleware(**kwargs) -> WebhookTriggerMiddleware:
    """
    Create webhook trigger middleware

    Args:
        **kwargs: Configuration options

    Returns:
        Configured middleware

    Example:
        middleware = webhook_trigger_middleware(
            trigger_on_start=True,
            trigger_on_complete=True,
            include_full_output=False  # Privacy
        )
    """
    return WebhookTriggerMiddleware(**kwargs)
