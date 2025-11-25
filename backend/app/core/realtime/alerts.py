"""
Threshold monitoring and alerting system.
Monitors agent health and triggers alerts when thresholds are breached.
"""
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional

from app.core.realtime.metrics import get_agent_metrics
from app.utils.logging import get_logger

logger = get_logger(__name__)


class AlertSeverity(str, Enum):
    """Alert severity levels."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AlertType(str, Enum):
    """Alert types."""
    AGENT_FAILURE_RATE = "agent_failure_rate"
    AGENT_RESPONSE_TIME = "agent_response_time"
    QUOTA_LOW = "quota_low"
    WEBSOCKET_OVERLOAD = "websocket_overload"
    ERROR_RATE_HIGH = "error_rate_high"


# Default thresholds
THRESHOLDS = {
    "agent_failure_rate": 0.10,      # 10%
    "agent_response_time": 5000,      # 5 seconds
    "quota_remaining": 0.20,          # 20%
    "websocket_connections": 1000,
    "error_rate": 0.05                # 5%
}


class AlertManager:
    """
    Manages threshold monitoring and alerting.
    """

    def __init__(self, thresholds: Optional[Dict[str, float]] = None):
        """
        Initialize alert manager.

        Args:
            thresholds: Custom thresholds (optional)
        """
        self.thresholds = thresholds or THRESHOLDS
        self.alerts_sent = {}  # Track sent alerts to avoid duplicates

    async def check_thresholds(self) -> List[Dict[str, any]]:
        """
        Check all thresholds and return any alerts.

        Returns:
            List of alert dictionaries
        """
        alerts = []

        # Check agent health (would need list of agents)
        # For now, this is a placeholder showing the pattern

        return alerts

    async def check_agent_health(self, agent_name: str) -> Dict[str, any]:
        """
        Check health of a specific agent.

        Args:
            agent_name: Name of the agent to check

        Returns:
            Dict with health status and any warnings/alerts
        """
        try:
            # Get agent metrics
            metrics = await get_agent_metrics(agent_name, period="hour")

            warnings = []
            alerts = []

            # Check failure rate
            failure_rate = metrics["failure_rate"]
            if failure_rate > self.thresholds["agent_failure_rate"]:
                severity = self._get_failure_severity(failure_rate)

                alert = {
                    "type": AlertType.AGENT_FAILURE_RATE,
                    "severity": severity,
                    "agent_name": agent_name,
                    "metric": "failure_rate",
                    "value": failure_rate,
                    "threshold": self.thresholds["agent_failure_rate"],
                    "message": f"Agent {agent_name} failure rate ({failure_rate:.2%}) exceeds threshold ({self.thresholds['agent_failure_rate']:.2%})",
                    "timestamp": datetime.utcnow().isoformat(),
                }

                if severity in [AlertSeverity.ERROR, AlertSeverity.CRITICAL]:
                    alerts.append(alert)
                else:
                    warnings.append(alert)

            # Check response time
            avg_response_time = metrics["avg_response_time"]
            if avg_response_time > self.thresholds["agent_response_time"]:
                alert = {
                    "type": AlertType.AGENT_RESPONSE_TIME,
                    "severity": AlertSeverity.WARNING,
                    "agent_name": agent_name,
                    "metric": "avg_response_time",
                    "value": avg_response_time,
                    "threshold": self.thresholds["agent_response_time"],
                    "message": f"Agent {agent_name} average response time ({avg_response_time:.0f}ms) exceeds threshold ({self.thresholds['agent_response_time']:.0f}ms)",
                    "timestamp": datetime.utcnow().isoformat(),
                }
                warnings.append(alert)

            # Determine overall health
            healthy = len(alerts) == 0

            return {
                "agent_name": agent_name,
                "healthy": healthy,
                "metrics": metrics,
                "warnings": warnings,
                "alerts": alerts,
            }

        except Exception as e:
            logger.error(
                "check_agent_health_failed",
                agent_name=agent_name,
                error=str(e),
            )
            return {
                "agent_name": agent_name,
                "healthy": False,
                "error": str(e),
            }

    def _get_failure_severity(self, failure_rate: float) -> AlertSeverity:
        """
        Determine severity based on failure rate.

        Args:
            failure_rate: Agent failure rate (0.0 - 1.0)

        Returns:
            AlertSeverity: Severity level
        """
        if failure_rate > 0.50:
            return AlertSeverity.CRITICAL
        elif failure_rate > 0.30:
            return AlertSeverity.ERROR
        elif failure_rate > 0.15:
            return AlertSeverity.WARNING
        else:
            return AlertSeverity.INFO

    async def send_alert(
        self,
        alert_type: str,
        message: str,
        severity: str,
        details: Optional[Dict[str, any]] = None
    ) -> None:
        """
        Send an alert through configured channels.

        Args:
            alert_type: Type of alert
            message: Alert message
            severity: Alert severity
            details: Additional details
        """
        # Create alert record
        alert = {
            "type": alert_type,
            "severity": severity,
            "message": message,
            "details": details or {},
            "timestamp": datetime.utcnow().isoformat(),
        }

        # Log alert
        log_method = getattr(logger, severity, logger.info)
        log_method(
            "alert_triggered",
            alert_type=alert_type,
            message=message,
            details=details,
        )

        # TODO: Send to notification channels (email, Slack, etc.)
        # For now, just logging

        # Track sent alert to avoid duplicates
        alert_key = f"{alert_type}:{message}"
        self.alerts_sent[alert_key] = datetime.utcnow()


async def check_agent_health(agent_name: str) -> Dict[str, any]:
    """
    Convenience function to check agent health.

    Args:
        agent_name: Name of the agent

    Returns:
        Dict with health status
    """
    manager = AlertManager()
    return await manager.check_agent_health(agent_name)
