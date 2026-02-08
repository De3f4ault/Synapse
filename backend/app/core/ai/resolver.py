"""
Model Resolver — Maps modes and tiers to actual models.

This is the brain that decides which model runs based on:
1. User's selected mode
2. Optional tier override
3. Model capabilities
4. Provider preference (Ollama first)
"""

from typing import Optional
import structlog

from app.core.ai.contracts.capability import Tier
from app.core.ai.registry.models import (
    MODEL_REGISTRY,
    TIER_DEFAULTS,
    get_model,
    ModelDescriptor,
)
from app.core.ai.modes.config import get_mode, ModeConfig

logger = structlog.get_logger(__name__)


class ModelResolver:
    """
    Resolves the best model for a given mode and tier.

    Resolution order:
    1. Explicit model override → use it (power user escape hatch)
    2. Tier from mode config (or override) → get candidates
    3. Filter by required capabilities
    4. Prefer Ollama if available
    5. Return first valid model
    """

    def __init__(self, prefer_ollama: bool = True):
        """
        Args:
            prefer_ollama: If True, prefer Ollama models over Google when available
        """
        self.prefer_ollama = prefer_ollama

    def resolve(
        self,
        mode_id: str = "socratic",
        tier_override: Optional[str] = None,
        model_override: Optional[str] = None,
    ) -> str:
        """
        Resolve the best model for the given mode and tier.

        Args:
            mode_id: The user's selected mode (socratic, direct, etc.)
            tier_override: Optional tier override (speed, balanced, reasoning, thinking)
            model_override: Optional direct model key (bypasses all logic)

        Returns:
            Model registry key (e.g., "deepseek_v3_1")
        """
        # 1. Direct override (power users)
        if model_override and model_override in MODEL_REGISTRY:
            logger.debug("resolver_model_override", model=model_override)
            return model_override

        # 2. Get mode config
        mode = get_mode(mode_id)

        # 3. Determine tier
        tier = self._resolve_tier(mode, tier_override)

        # 4. Get candidates for tier
        candidates = TIER_DEFAULTS.get(tier, [])
        if not candidates:
            logger.warning("resolver_no_candidates", tier=tier.value)
            return "gemini_flash"  # Ultimate fallback

        # 5. Filter by required capabilities
        valid_models = self._filter_by_capabilities(candidates, mode)

        if not valid_models:
            logger.info(
                "resolver_no_capability_match",
                mode=mode_id,
                tier=tier.value,
                falling_back_to=candidates[0],
            )
            return candidates[0]

        # 6. Apply provider preference
        chosen = self._apply_provider_preference(valid_models)

        logger.info(
            "resolver_selected",
            mode=mode_id,
            tier=tier.value,
            model=chosen,
            prefer_ollama=self.prefer_ollama,
        )

        return chosen

    def _resolve_tier(self, mode: ModeConfig, tier_override: Optional[str]) -> Tier:
        """Resolve the tier, validating against mode's allowed tiers."""
        if tier_override:
            try:
                tier = Tier(tier_override)
                if tier in mode.allowed_tiers:
                    return tier
                else:
                    logger.warning(
                        "resolver_tier_not_allowed",
                        tier=tier_override,
                        allowed=list(t.value for t in mode.allowed_tiers),
                        using_default=mode.default_tier.value,
                    )
                    return mode.default_tier
            except ValueError:
                logger.warning("resolver_invalid_tier", tier=tier_override)
                return mode.default_tier

        return mode.default_tier

    def _filter_by_capabilities(self, candidates: list[str], mode: ModeConfig) -> list[str]:
        """Filter models by required capabilities for the mode."""
        if not mode.required_capabilities:
            return candidates

        valid = []
        for model_key in candidates:
            model = get_model(model_key)
            if all(model.supports(cap) for cap in mode.required_capabilities):
                valid.append(model_key)

        return valid

    def _apply_provider_preference(self, candidates: list[str]) -> str:
        """Apply provider preference (Ollama first if enabled)."""
        if not self.prefer_ollama:
            return candidates[0]

        # Find first Ollama model
        for model_key in candidates:
            model = get_model(model_key)
            if model.provider == "ollama":
                return model_key

        # No Ollama available, use first candidate
        return candidates[0]

    def get_fallback(self, model_key: str) -> Optional[str]:
        """Get the fallback model for a given model."""
        try:
            model = get_model(model_key)
            return model.fallback_id
        except KeyError:
            return "gemini_flash"


# =============================================================================
# SINGLETON INSTANCE
# =============================================================================

_resolver: Optional[ModelResolver] = None


def get_resolver(prefer_ollama: bool = True) -> ModelResolver:
    """Get the global resolver instance."""
    global _resolver
    if _resolver is None:
        _resolver = ModelResolver(prefer_ollama=prefer_ollama)
    return _resolver


def resolve_model(
    mode_id: str = "socratic",
    tier_override: Optional[str] = None,
    model_override: Optional[str] = None,
    prefer_ollama: bool = True,
) -> str:
    """Convenience function for resolving a model."""
    resolver = get_resolver(prefer_ollama)
    return resolver.resolve(mode_id, tier_override, model_override)
