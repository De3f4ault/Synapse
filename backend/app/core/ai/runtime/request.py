"""
AIRequest — Standardized request object for model execution.

Decouples callers from provider-specific formats.
"""

from dataclasses import dataclass, field
from typing import Any, Optional

from app.core.ai.contracts.task import AITask
from app.core.ai.contracts.model_descriptor import ModelDescriptor


@dataclass
class AIRequest:
    """
    Standardized AI request.
    Callers build this; providers consume it.
    """

    task: AITask
    prompt: str
    system_prompt: Optional[str] = None
    context: Optional[str] = None
    images: list[bytes] = field(default_factory=list)  # For multimodal
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    metadata: dict[str, Any] = field(default_factory=dict)

    # Set by router, not caller
    _model: Optional[ModelDescriptor] = field(default=None, repr=False)

    def bind_model(self, model: ModelDescriptor) -> None:
        """Bind a model to this request (called by router)."""
        self._model = model

    @property
    def model(self) -> ModelDescriptor:
        """Get bound model."""
        if self._model is None:
            raise RuntimeError("Request has no bound model. Route first.")
        return self._model

    def to_messages(self) -> list[dict[str, str]]:
        """Convert to OpenAI/Ollama message format."""
        messages = []

        if self.system_prompt:
            messages.append({"role": "system", "content": self.system_prompt})

        if self.context:
            messages.append({"role": "user", "content": f"Context:\n{self.context}"})

        messages.append({"role": "user", "content": self.prompt})

        return messages

    def estimate_tokens(self) -> int:
        """Rough token estimate (4 chars per token)."""
        total_chars = len(self.prompt)
        if self.system_prompt:
            total_chars += len(self.system_prompt)
        if self.context:
            total_chars += len(self.context)
        return total_chars // 4
