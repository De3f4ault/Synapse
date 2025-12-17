"""
Base Provider Class - Abstract interface for AI providers

Defines the contract that all AI providers must implement.
Supports text generation, tool calling, and streaming.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field


@dataclass
class GenerationConfig:
    """Configuration for text generation"""
    model: str = "gemini-2.5-flash"
    temperature: float = 0.0
    max_tokens: int = 8192
    top_p: float = 0.95
    top_k: int = 40
    stop_sequences: List[str] = field(default_factory=list)
    thinking_budget: Optional[int] = None


@dataclass
class ProviderResponse:
    """Standardized response from AI providers"""
    text: str
    tool_calls: List[Dict[str, Any]] = field(default_factory=list)
    finish_reason: str = "stop"
    usage: Dict[str, int] = field(default_factory=dict)
    model: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)


class BaseProvider(ABC):
    """
    Abstract base class for AI providers

    All AI providers (Gemini, OpenAI, etc.) must implement this interface.
    """

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        config: Optional[GenerationConfig] = None,
        **kwargs
    ) -> ProviderResponse:
        """
        Generate text from a prompt

        Args:
            prompt: Input prompt text
            config: Generation configuration
            **kwargs: Additional provider-specific options

        Returns:
            ProviderResponse with generated text
        """
        pass

    @abstractmethod
    async def generate_with_tools(
        self,
        prompt: str,
        tools: List[Dict[str, Any]],
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate text with tool/function calling support

        Args:
            prompt: Input prompt text
            tools: List of tool definitions
            model: Model to use
            temperature: Sampling temperature
            **kwargs: Additional options

        Returns:
            Dict with 'text' and 'tool_calls' keys
        """
        pass

    @abstractmethod
    async def stream(
        self,
        prompt: str,
        config: Optional[GenerationConfig] = None,
        **kwargs
    ):
        """
        Stream generated text chunks

        Args:
            prompt: Input prompt text
            config: Generation configuration
            **kwargs: Additional options

        Yields:
            Text chunks as they are generated
        """
        pass

    @abstractmethod
    def count_tokens(self, text: str) -> int:
        """
        Count tokens in text

        Args:
            text: Text to count tokens for

        Returns:
            Token count
        """
        pass
