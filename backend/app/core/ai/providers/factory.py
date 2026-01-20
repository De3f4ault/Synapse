"""
Provider Factory — Get provider instances by name.
"""

from typing import Dict, Type
from app.core.ai.providers.base_provider import AIProvider


_provider_cache: Dict[str, AIProvider] = {}


def get_provider(provider_name: str) -> AIProvider:
    """
    Get a provider instance by name.

    Args:
        provider_name: "ollama" | "google"

    Returns:
        AIProvider instance (cached).
    """
    if provider_name in _provider_cache:
        return _provider_cache[provider_name]

    if provider_name == "ollama":
        from app.core.ai.providers.ollama_provider import OllamaProvider

        provider = OllamaProvider()

    elif provider_name == "google":
        from app.core.ai.providers.gemini import GeminiProvider

        # Wrap existing GeminiProvider to conform to AIProvider interface
        # For now, return it directly (will refactor in integration phase)
        provider = GeminiProvider()  # type: ignore

    else:
        raise ValueError(f"Unknown provider: {provider_name}")

    _provider_cache[provider_name] = provider
    return provider


def clear_provider_cache() -> None:
    """Clear the provider cache (for testing)."""
    _provider_cache.clear()
