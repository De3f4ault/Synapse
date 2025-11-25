"""
Agent Monitoring - Real-time performance tracking

Implements production monitoring with:
1. Redis Counters - Sub-millisecond metrics tracking
2. Alerts - Threshold-based alerting
3. Escalation - Auto-escalation on failures

Based on production monitoring best practices for AI agents.
"""

from app.core.ai.agents.monitoring.redis_counters import (
    AgentMetrics,
    track_agent_call,
    get_agent_metrics,
    increment_counter,
    get_counter
)
from app.core.ai.agents.monitoring.alerts import (
    AlertManager,
    AlertSeverity,
    Alert,
    send_agent_alert,
    get_recent_alerts
)
from app.core.ai.agents.monitoring.escalation import (
    EscalationLevel,
    check_escalation,
    execute_escalation,
    get_escalation_history
)

__all__ = [
    # Redis Counters
    "AgentMetrics",
    "track_agent_call",
    "get_agent_metrics",
    "increment_counter",
    "get_counter",

    # Alerts
    "AlertManager",
    "AlertSeverity",
    "Alert",
    "send_agent_alert",
    "get_recent_alerts",

    # Escalation
    "EscalationLevel",
    "check_escalation",
    "execute_escalation",
    "get_escalation_history",
]
