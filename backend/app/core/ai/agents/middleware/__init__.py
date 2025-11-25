"""
Agent Middleware - Production control hooks

Implements LangChain 1.0 Middleware pattern:
- before_execution: Run before agent starts
- after_execution: Run after agent completes

Middleware types:
1. ContextInjectionMiddleware - Inject SYNAPSE learning context
2. QuotaCheckMiddleware - Check Gemini API quotas
3. WebhookTriggerMiddleware - Trigger webhooks on events

Based on LangChain 1.0 middleware architecture and production best practices.
"""

from app.core.ai.agents.middleware.context_injection import (
    ContextInjectionMiddleware,
    context_injection_middleware
)
from app.core.ai.agents.middleware.quota_check import (
    QuotaCheckMiddleware,
    quota_check_middleware
)
from app.core.ai.agents.middleware.webhook_trigger import (
    WebhookTriggerMiddleware,
    webhook_trigger_middleware
)

__all__ = [
    "ContextInjectionMiddleware",
    "context_injection_middleware",
    "QuotaCheckMiddleware",
    "quota_check_middleware",
    "WebhookTriggerMiddleware",
    "webhook_trigger_middleware",
]
