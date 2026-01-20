"""
AIResponse — Standardized response object from model execution.

Normalizes responses across providers.
"""

from dataclasses import dataclass, field
from typing import Any, Optional
from datetime import datetime, timezone


@dataclass
class AIResponse:
    """
    Standardized AI response.
    Providers produce this; callers consume it.
    """

    content: str
    model_id: str
    provider: str
    tokens_input: int = 0
    tokens_output: int = 0
    latency_ms: float = 0.0
    success: bool = True
    error: Optional[str] = None
    routing_metadata: dict[str, Any] = field(default_factory=dict)
    raw_response: Optional[Any] = field(default=None, repr=False)
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def tokens_total(self) -> int:
        """Total tokens used."""
        return self.tokens_input + self.tokens_output

    @classmethod
    def from_ollama(cls, response: dict, model_id: str, latency_ms: float = 0.0) -> "AIResponse":
        """Create from Ollama response."""
        message = response.get("message", {})
        return cls(
            content=message.get("content", ""),
            model_id=model_id,
            provider="ollama",
            tokens_input=response.get("prompt_eval_count", 0),
            tokens_output=response.get("eval_count", 0),
            latency_ms=latency_ms,
            raw_response=response,
        )

    @classmethod
    def from_error(cls, error: str, model_id: str, provider: str) -> "AIResponse":
        """Create error response."""
        return cls(
            content="",
            model_id=model_id,
            provider=provider,
            success=False,
            error=error,
        )
