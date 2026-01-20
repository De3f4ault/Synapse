"""
OllamaProvider — Ollama Cloud/Local provider implementation.

Supports both local Ollama and Ollama Cloud endpoints.
No Gemini leakage. No assumptions elsewhere.
"""

import time
from typing import AsyncIterator, Optional
import structlog

from app.core.ai.providers.base_provider import AIProvider
from app.core.ai.runtime.request import AIRequest
from app.core.ai.runtime.response import AIResponse
from app.core.config import settings


logger = structlog.get_logger(__name__)


class OllamaProvider(AIProvider):
    """
    Ollama provider for local and cloud models.

    Configuration:
        - OLLAMA_BASE_URL: Base URL for Ollama API (default: http://localhost:11434)
        - OLLAMA_API_KEY: API key for Ollama Cloud (optional, for cloud only)
    """

    def __init__(self, base_url: Optional[str] = None, api_key: Optional[str] = None):
        self._base_url = base_url or getattr(settings, "OLLAMA_BASE_URL", "http://localhost:11434")
        self._api_key = api_key or getattr(settings, "OLLAMA_API_KEY", None)

        # Build headers for cloud authentication
        self._headers = {}
        if self._api_key:
            self._headers["Authorization"] = f"Bearer {self._api_key}"

    def _get_client(self):
        """Get Ollama client with appropriate configuration."""
        import ollama

        # For cloud, pass headers; for local, just host
        if self._api_key:
            return ollama.Client(host=self._base_url, headers=self._headers)
        return ollama.Client(host=self._base_url)

    @property
    def provider_name(self) -> str:
        return "ollama"

    async def generate(self, request: AIRequest) -> AIResponse:
        """Generate using Ollama API."""

        start_time = time.time()

        try:
            client = self._get_client()

            response = client.chat(
                model=request.model.model_id,
                messages=request.to_messages(),
                options={
                    "temperature": request.temperature,
                    **({"num_predict": request.max_tokens} if request.max_tokens else {}),
                },
            )

            latency_ms = (time.time() - start_time) * 1000

            ai_response = AIResponse.from_ollama(
                response=response,
                model_id=request.model.model_id,
                latency_ms=latency_ms,
            )

            logger.info(
                "ollama_generation_complete",
                model=request.model.model_id,
                task=request.task.value,
                tokens_in=ai_response.tokens_input,
                tokens_out=ai_response.tokens_output,
                latency_ms=round(latency_ms, 1),
            )

            return ai_response

        except Exception as e:
            latency_ms = (time.time() - start_time) * 1000

            logger.error(
                "ollama_generation_failed",
                model=request.model.model_id,
                task=request.task.value,
                error=str(e),
                latency_ms=round(latency_ms, 1),
            )

            return AIResponse.from_error(
                error=str(e),
                model_id=request.model.model_id,
                provider="ollama",
            )

    async def stream(self, request: AIRequest) -> AsyncIterator[str]:
        """Stream response tokens from Ollama."""

        try:
            client = self._get_client()

            stream = client.chat(
                model=request.model.model_id,
                messages=request.to_messages(),
                stream=True,
                options={
                    "temperature": request.temperature,
                    **({"num_predict": request.max_tokens} if request.max_tokens else {}),
                },
            )

            for chunk in stream:
                if "message" in chunk and "content" in chunk["message"]:
                    yield chunk["message"]["content"]

        except Exception as e:
            logger.error(
                "ollama_streaming_failed",
                model=request.model.model_id,
                error=str(e),
            )
            yield f"[Error: {str(e)}]"

    async def stream_with_tools(
        self,
        prompt: str,
        tools: list = None,
        model: str = None,
        temperature: float = 0.0,
        **kwargs,
    ):
        """
        Stream responses with optional tool calling.

        Note: Ollama has limited tool support compared to Gemini.
        This provides a compatible interface for agents.

        Args:
            prompt: Input prompt
            tools: Optional list of tool definitions (limited support)
            model: Model name
            temperature: Sampling temperature
            **kwargs: Additional options

        Yields:
            {"type": "text", "content": "chunk"}
            {"type": "complete", "text": "...", "usage": {...}}
        """
        model_name = model or "deepseek-r1:32b"

        try:
            client = self._get_client()

            # Build messages
            messages = [{"role": "user", "content": prompt}]

            # Stream response
            total_text = ""
            stream = client.chat(
                model=model_name,
                messages=messages,
                stream=True,
                options={
                    "temperature": temperature,
                },
            )

            for chunk in stream:
                if "message" in chunk and "content" in chunk["message"]:
                    text = chunk["message"]["content"]
                    total_text += text
                    yield {"type": "text", "content": text}

            # Final completion
            yield {
                "type": "complete",
                "text": total_text,
                "tool_calls": [],  # Ollama tool support is limited
                "usage": {},
                "model": model_name,
            }

            logger.info(
                "ollama_stream_with_tools_completed",
                model=model_name,
                text_length=len(total_text),
            )

        except Exception as e:
            logger.error("ollama_stream_with_tools_failed", model=model_name, error=str(e))
            yield {"type": "error", "message": str(e)}

    def supports_streaming(self) -> bool:
        return True

    def supports_multimodal(self) -> bool:
        return False  # Ollama multimodal support varies by model
