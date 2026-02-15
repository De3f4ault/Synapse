"""
Agent Escalation System

Implements auto-escalation when agents fail repeatedly.
Based on 2025 best practices for production agent monitoring.
"""

from enum import Enum
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import structlog
from app.core.ai.registry.models import DEFAULT_CHAT_MODEL, DEFAULT_GENERATION_MODEL

logger = structlog.get_logger(__name__)


class EscalationLevel(Enum):
    """Escalation severity levels"""

    NONE = 0  # No action needed
    LOG_WARNING = 1  # Just log
    SWITCH_MODEL = 2  # Upgrade to better model
    HUMAN_REVIEW = 3  # Flag for human review
    DISABLE_AGENT = 4  # Disable agent completely


class EscalationEvent:
    """Record of an escalation event"""

    def __init__(
        self,
        agent_name: str,
        level: EscalationLevel,
        reason: str,
        metrics: Dict[str, Any],
        timestamp: datetime = None,
    ):
        self.agent_name = agent_name
        self.level = level
        self.reason = reason
        self.metrics = metrics
        self.timestamp = timestamp or datetime.utcnow()
        self.acknowledged = False
        self.acknowledged_by = None
        self.acknowledged_at = None


async def check_escalation(agent_name: str) -> EscalationLevel:
    """
    Check if escalation needed based on metrics

    Thresholds based on production recommendations:
    - failure_rate > 0.50 → DISABLE_AGENT
    - failure_rate > 0.30 → HUMAN_REVIEW
    - failure_rate > 0.15 → SWITCH_MODEL
    - failure_rate > 0.10 → LOG_WARNING
    - avg_response_time > 10s → SWITCH_MODEL

    Args:
        agent_name: Agent to check

    Returns:
        Escalation level needed
    """
    from app.core.ai.agents.monitoring.counters import get_agent_metrics

    try:
        metrics = await get_agent_metrics(agent_name, period="hour")

        failure_rate = metrics.failure_rate
        avg_time = metrics.avg_execution_time_ms

        # Check failure rate thresholds
        if failure_rate > 0.50:
            logger.critical(
                "agent_failure_rate_critical", agent=agent_name, failure_rate=failure_rate
            )
            return EscalationLevel.DISABLE_AGENT

        elif failure_rate > 0.30:
            logger.error("agent_failure_rate_high", agent=agent_name, failure_rate=failure_rate)
            return EscalationLevel.HUMAN_REVIEW

        elif failure_rate > 0.15:
            logger.warning(
                "agent_failure_rate_elevated", agent=agent_name, failure_rate=failure_rate
            )
            return EscalationLevel.SWITCH_MODEL

        elif failure_rate > 0.10:
            logger.info("agent_failure_rate_increased", agent=agent_name, failure_rate=failure_rate)
            return EscalationLevel.LOG_WARNING

        # Check response time (10 second threshold)
        if avg_time > 10000:
            logger.warning("agent_response_time_slow", agent=agent_name, avg_time_ms=avg_time)
            return EscalationLevel.SWITCH_MODEL

        return EscalationLevel.NONE

    except Exception as e:
        logger.error("escalation_check_failed", agent=agent_name, error=str(e))
        return EscalationLevel.NONE


async def execute_escalation(
    agent_name: str, level: EscalationLevel, metrics: Optional[Dict] = None
) -> None:
    """
    Execute escalation action

    Args:
        agent_name: Agent to escalate
        level: Escalation level
        metrics: Optional metrics snapshot
    """
    from app.core.ai.agents.registry import get_agent_registry
    from app.core.ai.agents.monitoring.alerts import send_agent_alert, AlertSeverity

    if level == EscalationLevel.NONE:
        return

    # Record escalation event
    event = EscalationEvent(
        agent_name=agent_name,
        level=level,
        reason=f"Escalation triggered at level {level.name}",
        metrics=metrics or {},
    )

    if level == EscalationLevel.LOG_WARNING:
        logger.warning("agent_performance_degraded", agent=agent_name, level=level.name)

    elif level == EscalationLevel.SWITCH_MODEL:
        # Upgrade agent to better model (Gemini upgrade path)
        registry = get_agent_registry()
        agent = registry.get(agent_name)

        current_model = agent.config.model

        # Gemini upgrade path: flash-8b → flash → pro
        upgrade_map = {
            "gemini-2.5-flash-8b": DEFAULT_CHAT_MODEL,
            DEFAULT_CHAT_MODEL: DEFAULT_GENERATION_MODEL,
        }

        new_model = upgrade_map.get(current_model)
        if new_model:
            agent.config.model = new_model
            logger.info(
                "agent_model_upgraded",
                agent=agent_name,
                from_model=current_model,
                to_model=new_model,
            )

            await send_agent_alert(
                "agent_model_upgrade",
                AlertSeverity.WARNING,
                agent_name,
                f"Agent upgraded from {current_model} to {new_model}",
                {
                    "from_model": current_model,
                    "to_model": new_model,
                    "reason": "performance_degradation",
                },
            )
        else:
            logger.warning(
                "agent_model_upgrade_unavailable", agent=agent_name, current_model=current_model
            )

    elif level == EscalationLevel.HUMAN_REVIEW:
        # Send critical alert requiring human review
        await send_agent_alert(
            "agent_needs_review",
            AlertSeverity.ERROR,
            agent_name,
            f"Agent {agent_name} requires human review due to high failure rate",
            {
                "escalation_level": level.name,
                "metrics": metrics or {},
                "action_required": "review_and_acknowledge",
            },
        )

        logger.error("agent_needs_review", agent=agent_name, metrics=metrics)

        # Flag agent for review (but don't disable)
        registry = get_agent_registry()
        agent = registry.get(agent_name)
        agent.config.requires_review = True

    elif level == EscalationLevel.DISABLE_AGENT:
        # Disable agent completely
        registry = get_agent_registry()
        agent = registry.get(agent_name)
        agent.config.enabled = False

        await send_agent_alert(
            "agent_disabled",
            AlertSeverity.CRITICAL,
            agent_name,
            f"Agent {agent_name} disabled due to excessive failures",
            {
                "escalation_level": level.name,
                "metrics": metrics or {},
                "action_required": "manual_intervention_required",
            },
        )

        logger.critical("agent_disabled", agent=agent_name, metrics=metrics)


async def get_escalation_history(
    agent_name: Optional[str] = None, hours: int = 24
) -> List[EscalationEvent]:
    """
    Get escalation history

    Args:
        agent_name: Optional agent filter
        hours: Time window in hours

    Returns:
        List of escalation events
    """
    # TODO: Query from database
    # For now, return empty list
    return []


async def acknowledge_escalation(event_id: str, user_id: int, notes: Optional[str] = None) -> bool:
    """
    Acknowledge an escalation event

    Args:
        event_id: Escalation event ID
        user_id: User acknowledging
        notes: Optional notes

    Returns:
        Success status
    """
    # TODO: Update database
    logger.info("escalation_acknowledged", event_id=event_id, user_id=user_id, notes=notes)
    return True


async def reset_agent_after_review(agent_name: str) -> bool:
    """
    Reset agent to normal operation after review

    Args:
        agent_name: Agent to reset

    Returns:
        Success status
    """
    from app.core.ai.agents.registry import get_agent_registry

    registry = get_agent_registry()
    agent = registry.get(agent_name)

    # Re-enable if disabled
    agent.config.enabled = True
    agent.config.requires_review = False

    logger.info("agent_reset_after_review", agent=agent_name)

    return True
