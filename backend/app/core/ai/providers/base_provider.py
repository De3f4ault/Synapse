"""
AIProvider — Base class for all AI providers.

All providers must conform to this interface.
Zero SDK leakage outside provider implementations.
"""

from abc import ABC, abstractmethod
from typing import AsyncIterator

from app.core.ai.runtime.request import AIRequest
from app.core.ai.runtime.response import AIResponse


class AIProvider(ABC):
    """
    Abstract base class for AI providers.

    All providers (Ollama, Gemini, OpenAI) must implement this.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Unique provider identifier."""
        ...

    @abstractmethod
    async def generate(self, request: AIRequest) -> AIResponse:
        """
        Generate a response for the given request.

        Args:
            request: AIRequest with task, prompt, and bound model.

        Returns:
            AIResponse with content and metadata.
        """
        ...

    async def stream(self, request: AIRequest) -> AsyncIterator[str]:
        """
        Stream response tokens.

        Default implementation falls back to non-streaming.
        Override for true streaming support.
        """
        response = await self.generate(request)
        yield response.content

    def supports_streaming(self) -> bool:
        """Whether this provider supports true streaming."""
        return False

    def supports_multimodal(self) -> bool:
        """Whether this provider supports multimodal inputs."""
        return False
