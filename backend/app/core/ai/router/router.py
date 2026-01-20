"""
AIRouter — The Cognitive Router.

Maps intent → capability → model → provider.
Think of it as DNS for intelligence.
"""

from datetime import datetime, timezone
from dataclasses import dataclass
from typing import Optional
import structlog

from app.core.ai.contracts.task import AITask
from app.core.ai.contracts.model_descriptor import ModelDescriptor
from app.core.ai.registry.models import MODEL_REGISTRY, get_model
from .policies import TASK_TO_MODEL, FALLBACK_CHAIN


logger = structlog.get_logger(__name__)


@dataclass
class ModelRoutingDecision:
    """
    Ledger-compatible routing decision.
    Every choice is logged and explainable.
    """

    task: AITask
    selected_model: str
    model_id: str
    provider: str
    decision_reason: str
    fallback_used: bool
    timestamp: datetime

    def to_dict(self) -> dict:
        """Convert to dict for logging/storage."""
        return {
            "task": self.task.value,
            "selected_model": self.selected_model,
            "model_id": self.model_id,
            "provider": self.provider,
            "decision_reason": self.decision_reason,
            "fallback_used": self.fallback_used,
            "timestamp": self.timestamp.isoformat(),
        }


class AIRouter:
    """
    The Cognitive Router.

    Chooses which model should handle a given task.
    Selection is deterministic and explainable.
    """

    def route(
        self,
        task: AITask,
        context_tokens: int = 0,
        require_multimodal: bool = False,
    ) -> ModelRoutingDecision:
        """
        Route a task to the best available model.

        Args:
            task: The cognitive task to perform.
            context_tokens: Approximate token count for context filtering.
            require_multimodal: If True, only consider multimodal-capable models.

        Returns:
            ModelRoutingDecision with selected model and justification.

        Raises:
            RuntimeError: If no suitable model is found.
        """
        model_key = TASK_TO_MODEL.get(task)

        if model_key is None:
            raise RuntimeError(f"No routing policy defined for task: {task.value}")

        model = get_model(model_key)
        fallback_used = False
        decision_reason = f"Primary candidate for '{task.value}'"

        # Check context limit
        if context_tokens > model.max_context_tokens:
            model_key, model, fallback_used = self._try_fallback(
                model_key,
                context_tokens=context_tokens,
                require_multimodal=require_multimodal,
            )
            decision_reason = f"Fallback due to context size ({context_tokens} tokens)"

        # Check multimodal requirement
        if require_multimodal and not model.supports_multimodal:
            model_key, model, fallback_used = self._try_fallback(
                model_key,
                context_tokens=context_tokens,
                require_multimodal=True,
            )
            decision_reason = "Fallback due to multimodal requirement"

        decision = ModelRoutingDecision(
            task=task,
            selected_model=model_key,
            model_id=model.model_id,
            provider=model.provider,
            decision_reason=decision_reason,
            fallback_used=fallback_used,
            timestamp=datetime.now(timezone.utc),
        )

        logger.info(
            "model_routing_decision",
            task=task.value,
            model=model.model_id,
            provider=model.provider,
            fallback=fallback_used,
            reason=decision_reason,
        )

        return decision

    def _try_fallback(
        self,
        primary_key: str,
        context_tokens: int = 0,
        require_multimodal: bool = False,
    ) -> tuple[str, ModelDescriptor, bool]:
        """Try fallback models if primary doesn't meet requirements."""
        fallbacks = FALLBACK_CHAIN.get(primary_key, [])

        for fallback_key in fallbacks:
            fallback_model = get_model(fallback_key)

            if context_tokens > fallback_model.max_context_tokens:
                continue

            if require_multimodal and not fallback_model.supports_multimodal:
                continue

            return fallback_key, fallback_model, True

        # No fallback found, return primary anyway (will likely fail)
        return primary_key, get_model(primary_key), False

    def get_model_for_decision(self, decision: ModelRoutingDecision) -> ModelDescriptor:
        """Get the full ModelDescriptor for a routing decision."""
        return get_model(decision.selected_model)


# Singleton instance
router = AIRouter()
