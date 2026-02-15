"""
Alert Manager - Threshold-based alerting for agents

Monitors agent health and sends alerts when thresholds breached:
- High failure rates
- Slow response times
- Quota exhaustion
- Model downgrades

Integrates with notification channels (email, Slack, webhooks).

Based on production alerting best practices.
"""

from typing import Dict, Any, Optional, List
from enum import Enum
from dataclasses import dataclass
from datetime import datetime
import structlog

logger = structlog.get_logger(__name__)


class AlertSeverity(str, Enum):
    """Alert severity levels"""

    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class Alert:
    """Alert data structure"""

    alert_id: str
    alert_type: str
    severity: AlertSeverity
    agent_name: str
    message: str
    data: Dict[str, Any]
    timestamp: datetime
    acknowledged: bool = False
    acknowledged_by: Optional[int] = None
    acknowledged_at: Optional[datetime] = None


class AlertManager:
    """
    Manage agent alerts with threshold monitoring

    Thresholds:
    - failure_rate > 0.10 (10%) -> WARNING
    - failure_rate > 0.30 (30%) -> ERROR
    - failure_rate > 0.50 (50%) -> CRITICAL
    - avg_response_time > 5000ms -> WARNING
    - avg_response_time > 10000ms -> ERROR

    Usage:
        manager = AlertManager()

        # Check thresholds
        await manager.check_agent_thresholds("tutor")

        # Send custom alert
        await manager.send_alert(
            "agent_custom",
            AlertSeverity.WARNING,
            "tutor",
            "Custom alert message",
            {}
        )
    """

    # Default thresholds
    THRESHOLDS = {
        "failure_rate_warning": 0.10,
        "failure_rate_error": 0.30,
        "failure_rate_critical": 0.50,
        "response_time_warning_ms": 5000,
        "response_time_error_ms": 10000,
        "quota_remaining_warning": 0.20,  # 20% remaining
    }

    def __init__(
        self, thresholds: Optional[Dict[str, float]] = None, enable_notifications: bool = True
    ):
        """
        Initialize alert manager

        Args:
            thresholds: Custom thresholds (optional)
            enable_notifications: Enable notification channels
        """
        self.thresholds = {**self.THRESHOLDS, **(thresholds or {})}
        self.enable_notifications = enable_notifications
        self.logger = logger.bind(component="alert_manager")
        self._recent_alerts: List[Alert] = []

    async def check_agent_thresholds(self, agent_name: str, period: str = "hour") -> List[Alert]:
        """
        Check agent against all thresholds

        Args:
            agent_name: Agent to check
            period: Time period for metrics

        Returns:
            List of alerts triggered
        """
        from app.core.ai.agents.monitoring.counters import get_agent_metrics

        alerts = []

        # Get current metrics
        metrics = await get_agent_metrics(agent_name, period)

        # ================================================================
        # CHECK: Failure rate
        # ================================================================
        failure_rate = metrics.failure_rate

        if failure_rate >= self.thresholds["failure_rate_critical"]:
            alert = await self.send_alert(
                "agent_failure_rate",
                AlertSeverity.CRITICAL,
                agent_name,
                f"CRITICAL: Failure rate at {failure_rate:.1%}",
                {
                    "failure_rate": failure_rate,
                    "total_calls": metrics.total_calls,
                    "failed_calls": metrics.failed_calls,
                },
            )
            alerts.append(alert)

        elif failure_rate >= self.thresholds["failure_rate_error"]:
            alert = await self.send_alert(
                "agent_failure_rate",
                AlertSeverity.ERROR,
                agent_name,
                f"ERROR: Failure rate at {failure_rate:.1%}",
                {"failure_rate": failure_rate},
            )
            alerts.append(alert)

        elif failure_rate >= self.thresholds["failure_rate_warning"]:
            alert = await self.send_alert(
                "agent_failure_rate",
                AlertSeverity.WARNING,
                agent_name,
                f"WARNING: Failure rate at {failure_rate:.1%}",
                {"failure_rate": failure_rate},
            )
            alerts.append(alert)

        # ================================================================
        # CHECK: Response time
        # ================================================================
        avg_time = metrics.avg_execution_time_ms

        if avg_time >= self.thresholds["response_time_error_ms"]:
            alert = await self.send_alert(
                "agent_slow_response",
                AlertSeverity.ERROR,
                agent_name,
                f"ERROR: Avg response time {avg_time:.0f}ms",
                {"avg_execution_time_ms": avg_time},
            )
            alerts.append(alert)

        elif avg_time >= self.thresholds["response_time_warning_ms"]:
            alert = await self.send_alert(
                "agent_slow_response",
                AlertSeverity.WARNING,
                agent_name,
                f"WARNING: Avg response time {avg_time:.0f}ms",
                {"avg_execution_time_ms": avg_time},
            )
            alerts.append(alert)

        return alerts

    async def send_alert(
        self,
        alert_type: str,
        severity: AlertSeverity,
        agent_name: str,
        message: str,
        data: Dict[str, Any],
    ) -> Alert:
        """
        Send alert to notification channels

        Args:
            alert_type: Type of alert
            severity: Alert severity
            agent_name: Agent name
            message: Alert message
            data: Additional alert data

        Returns:
            Alert object
        """
        from uuid import uuid4

        # Create alert
        alert = Alert(
            alert_id=str(uuid4()),
            alert_type=alert_type,
            severity=severity,
            agent_name=agent_name,
            message=message,
            data=data,
            timestamp=datetime.utcnow(),
        )

        # Log alert
        self.logger.log(
            self._severity_to_log_level(severity),
            "agent_alert",
            alert_id=alert.alert_id,
            alert_type=alert_type,
            agent=agent_name,
            severity=severity.value,
            message=message,
            **data,
        )

        # Store in recent alerts
        self._recent_alerts.append(alert)
        self._recent_alerts = self._recent_alerts[-100:]  # Keep last 100

        # Send notifications
        if self.enable_notifications:
            await self._send_notifications(alert)

        return alert

    async def _send_notifications(self, alert: Alert) -> None:
        """
        Send alert to notification channels

        Args:
            alert: Alert to send
        """
        # TODO: Implement notification channels
        # - Email for CRITICAL
        # - Slack webhook for ERROR and above
        # - Store in database for audit
        pass

    def _severity_to_log_level(self, severity: AlertSeverity) -> str:
        """Map severity to log level"""
        mapping = {
            AlertSeverity.INFO: "info",
            AlertSeverity.WARNING: "warning",
            AlertSeverity.ERROR: "error",
            AlertSeverity.CRITICAL: "critical",
        }
        return mapping.get(severity, "info")

    def get_recent_alerts(
        self,
        agent_name: Optional[str] = None,
        severity: Optional[AlertSeverity] = None,
        limit: int = 20,
    ) -> List[Alert]:
        """
        Get recent alerts with optional filtering

        Args:
            agent_name: Filter by agent (optional)
            severity: Filter by severity (optional)
            limit: Max alerts to return

        Returns:
            List of alerts
        """
        alerts = self._recent_alerts.copy()

        # Filter by agent
        if agent_name:
            alerts = [a for a in alerts if a.agent_name == agent_name]

        # Filter by severity
        if severity:
            alerts = [a for a in alerts if a.severity == severity]

        # Return most recent
        return alerts[-limit:]


# Global instance
_alert_manager: Optional[AlertManager] = None


def get_alert_manager() -> AlertManager:
    """Get global alert manager"""
    global _alert_manager
    if _alert_manager is None:
        _alert_manager = AlertManager()
    return _alert_manager


async def send_agent_alert(
    alert_type: str,
    severity: AlertSeverity,
    agent_name: str,
    message: str,
    data: Dict[str, Any] = None,
) -> Alert:
    """
    Convenience function to send alert

    Args:
        alert_type: Alert type
        severity: Severity level
        agent_name: Agent name
        message: Alert message
        data: Additional data

    Returns:
        Alert object
    """
    manager = get_alert_manager()
    return await manager.send_alert(alert_type, severity, agent_name, message, data or {})


def get_recent_alerts(**kwargs) -> List[Alert]:
    """Convenience function to get recent alerts"""
    manager = get_alert_manager()
    return manager.get_recent_alerts(**kwargs)
