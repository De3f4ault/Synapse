"""
AI Agents Module — Custom ReAct Agents with Typed State

This module implements production-ready AI agents following:
- ReAct (Reasoning + Acting) pattern via custom loop
- SYNAPSE middleware architecture (before/after execution hooks)
- DeepAgents principles (planning, delegation, persistence)
- SYNAPSE context injection

Best Practices Applied:
1. Middleware for production control (before/after hooks)
2. Real-time monitoring via Redis counters
3. Auto-escalation on failures
4. Human-in-the-loop for sensitive operations
5. Context window management
6. Structured outputs for reliability
"""

from app.core.ai.agents.base_agent import BaseAgent, AgentConfig, AgentCapability
from app.core.ai.agents.factory import AgentFactory, create_agent
from app.core.ai.agents.registry import AgentRegistry, get_agent_registry

# Middleware exports
from app.core.ai.agents.middleware.context_injection import (
    ContextInjectionMiddleware,
    context_injection_middleware,
)
from app.core.ai.agents.middleware.quota_check import QuotaCheckMiddleware, quota_check_middleware
from app.core.ai.agents.middleware.webhook_trigger import (
    WebhookTriggerMiddleware,
    webhook_trigger_middleware,
)

# Monitoring exports
from app.core.ai.agents.monitoring.counters import (
    AgentMetrics,
    track_agent_call,
    get_agent_metrics,
)
from app.core.ai.agents.monitoring.alerts import AlertManager, AlertSeverity, send_agent_alert
from app.core.ai.agents.monitoring.escalation import (
    EscalationLevel,
    check_escalation,
    execute_escalation,
)

# Agent implementations
from app.core.ai.agents.implementations.tutor_agent import TutorAgent
from app.core.ai.agents.implementations.document_agent import DocumentAgent
from app.core.ai.agents.implementations.quiz_agent import QuizAgent
from app.core.ai.agents.implementations.general_assistant_agent import GeneralAssistantAgent

__all__ = [
    # Core classes
    "BaseAgent",
    "AgentConfig",
    "AgentCapability",
    "AgentFactory",
    "AgentRegistry",
    "create_agent",
    "get_agent_registry",
    # Middleware
    "ContextInjectionMiddleware",
    "context_injection_middleware",
    "QuotaCheckMiddleware",
    "quota_check_middleware",
    "WebhookTriggerMiddleware",
    "webhook_trigger_middleware",
    # Monitoring
    "AgentMetrics",
    "track_agent_call",
    "get_agent_metrics",
    "AlertManager",
    "AlertSeverity",
    "send_agent_alert",
    "EscalationLevel",
    "check_escalation",
    "execute_escalation",
    # Implementations
    "TutorAgent",
    "DocumentAgent",
    "QuizAgent",
    "GeneralAssistantAgent",
]

# Version info
__version__ = "1.0.0"
__author__ = "SYNAPSE Team"
__description__ = "Production-ready AI agents with DeepAgents pattern"
