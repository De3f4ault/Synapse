"""
ModelDescriptor — Immutable description of an AI model.

Every model must describe itself honestly.
Used ONLY by the router for selection decisions.
"""

from dataclasses import dataclass
from typing import FrozenSet

from .capability import AICapability


@dataclass(frozen=True)
class ModelDescriptor:
    """
    Immutable description of a model.
    Used ONLY by the router.
    """

    model_id: str
    provider: str  # "ollama" | "google" | "openai"
    capabilities: FrozenSet[AICapability]
    max_context_tokens: int
    supports_multimodal: bool
    cost_tier: str  # "free" | "low" | "medium" | "high"
    strengths: tuple[str, ...] = ()  # Human-readable
    known_limitations: tuple[str, ...] = ()  # For debugging

    def supports(self, capability: AICapability) -> bool:
        """Check if model supports a capability."""
        return capability in self.capabilities
