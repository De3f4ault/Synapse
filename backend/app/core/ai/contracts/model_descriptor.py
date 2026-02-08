"""
ModelDescriptor — Immutable description of an AI model.

Every model must describe itself honestly.
Used ONLY by the router for selection decisions.
"""

from dataclasses import dataclass
from typing import FrozenSet, Optional

from .capability import AICapability, Tier


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

    # Mode-based selection fields
    tier: Tier = Tier.BALANCED
    fallback_id: Optional[str] = None  # Model ID to fallback to on error
    supports_thinking: bool = False  # Emits <think> tags or thinking stream

    # Human-readable info
    strengths: tuple[str, ...] = ()
    known_limitations: tuple[str, ...] = ()

    def supports(self, capability: AICapability) -> bool:
        """Check if model supports a capability."""
        return capability in self.capabilities
