"""
Provider Factory — Get provider instances by name.

ARCHITECTURE NOTE: All LLM completion and streaming should use
`get_llm_router()` from `app.core.ai.providers.litellm_router`.

This factory is kept only for GeminiProvider, which retains proprietary
context-caching methods (create_context_cache, etc.) that LiteLLM does
not yet wrap. OllamaProvider has been permanently retired.
"""

from typing import Any, Dict
from app.core.ai.providers.base_provider import AIProvider


_provider_cache: Dict[str, Any] = {}


def get_provider(provider_name: str) -> Any:
    """
    Get a provider instance by name.

    Args:
        provider_name: "google" | "litellm"

    Returns:
        AIProvider instance (cached), or the LiteLLM Router for "litellm".
    """
    if provider_name in _provider_cache:
        return _provider_cache[provider_name]

    if provider_name == "litellm":
        # Preferred path for all completion/streaming calls.
        from app.core.ai.providers.litellm_router import get_llm_router
        return get_llm_router()

    elif provider_name == "google":
        from app.core.ai.providers.gemini import GeminiProvider
        # Kept for context caching (create_context_cache, etc.)
        provider = GeminiProvider()  # type: ignore
        _provider_cache[provider_name] = provider
        return provider

    else:
        raise ValueError(
            f"Unknown provider: {provider_name!r}. "
            "Use get_llm_router() for LLM completions, or 'google' for Gemini context caching."
        )


def clear_provider_cache() -> None:
    """Clear the provider cache (for testing)."""
    _provider_cache.clear()
