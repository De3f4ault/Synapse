"""
Gemini Provider - Google Gemini AI integration

Implements the BaseProvider interface for Google's Gemini models.
Supports text generation, function calling, and streaming.

NOTE: This module uses the new google-genai SDK (not google-generativeai).
"""

from typing import Any, Dict, List, Optional, AsyncGenerator
import structlog
from google import genai

from app.core.config import settings
from app.core.ai.providers.base import BaseProvider, GenerationConfig, ProviderResponse

logger = structlog.get_logger(__name__)


class GeminiProvider(BaseProvider):
    """
    Google Gemini AI Provider

    Supports:
    - Text generation (gemini-2.5-flash, gemini-2.5-pro)
    - Function/tool calling
    - Streaming responses
    - Token counting

    Model options (as of November 2025):
    Flash Series (fast, high throughput):
    - gemini-2.5-flash: Standard model for chat/feedback
    - gemini-2.5-flash-lite: Cost-effective, high volume
    - gemini-2.5-flash-8b: Ultra-lightweight

    Pro Series (high reasoning):
    - gemini-2.5-pro: Complex reasoning, content generation
    - gemini-3.0-pro-preview: Next-gen (preview)

    Embeddings:
    - text-embedding-005: Vector embeddings

    Usage:
        provider = GeminiProvider()
        response = await provider.generate("Hello, how are you?")
        print(response.text)
    """

    # Valid Gemini models (as of late 2025)
    # Chat: gemini-2.5-flash
    # Generation: gemini-2.5-pro
    # Embeddings: text-embedding-005

    MODEL_ALIASES = {}  # Removed old aliases to enforce explicit naming

    # Default models for different use cases
    CHAT_MODEL = "gemini-2.5-flash"
    GENERATION_MODEL = "gemini-2.5-pro"
    EMBEDDING_MODEL = "text-embedding-005"

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Gemini provider

        Args:
            api_key: Optional API key (defaults to settings.GEMINI_API_KEY)
        """
        self.api_key = api_key or settings.GEMINI_API_KEY
        # Initialize new SDK client
        self.client = genai.Client(api_key=self.api_key)
        self.logger = logger.bind(provider="gemini")

    async def create_context_cache(
        self,
        name: str,
        content: Any,
        model: str = "gemini-2.5-pro",
        ttl_minutes: int = 60,
    ) -> str:
        """
        Create a context cache for large content

        NOTE: Context caching requires the new SDK's caching API.
        This is a placeholder until google-genai SDK adds caching support.

        Args:
            name: Unique name for the cache
            content: Content to cache (file object, text, etc)
            model: Model to use with cache
            ttl_minutes: Time to live in minutes

        Returns:
            Cache name/resource identifier
        """
        # TODO: Implement with new SDK when caching support is added
        self.logger.warning(
            "context_cache_not_implemented",
            message="Context caching requires google-generativeai SDK which was removed. Use direct content passing instead.",
        )
        raise NotImplementedError("Context caching not yet supported with google-genai SDK")

    def _resolve_model_name(self, model_name: str) -> str:
        """Resolve model aliases to actual model names"""
        return self.MODEL_ALIASES.get(model_name, model_name)

    async def generate(
        self, prompt: str, config: Optional[GenerationConfig] = None, **kwargs
    ) -> ProviderResponse:
        """
        Generate text from prompt

        Args:
            prompt: Input prompt
            config: Generation configuration
            **kwargs: Additional options

        Returns:
            ProviderResponse with generated text
        """
        config = config or GenerationConfig()
        model_name = self._resolve_model_name(config.model)

        try:
            # Build generation config for new SDK
            gen_config = {
                "temperature": config.temperature,
                "max_output_tokens": config.max_tokens,
                "top_p": config.top_p,
                "top_k": config.top_k,
            }
            if config.stop_sequences:
                gen_config["stop_sequences"] = config.stop_sequences

            # Use new SDK async API
            response = await self.client.aio.models.generate_content(
                model=model_name, contents=prompt, config=gen_config
            )

            text = response.text if response.text else ""

            # Extract usage if available
            usage = {}
            if hasattr(response, "usage_metadata") and response.usage_metadata:
                usage = {
                    "prompt_tokens": getattr(response.usage_metadata, "prompt_token_count", 0),
                    "completion_tokens": getattr(
                        response.usage_metadata, "candidates_token_count", 0
                    ),
                    "total_tokens": getattr(response.usage_metadata, "total_token_count", 0),
                }

            self.logger.info(
                "generation_completed",
                model=model_name,
                prompt_length=len(prompt),
                response_length=len(text),
            )

            return ProviderResponse(
                text=text, tool_calls=[], finish_reason="stop", usage=usage, model=model_name
            )

        except Exception as e:
            self.logger.error("generation_failed", model=model_name, error=str(e))
            raise

    async def generate_with_tools(
        self,
        prompt: str,
        tools: List[Dict[str, Any]],
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        **kwargs,
    ) -> Dict[str, Any]:
        """
        Generate with function/tool calling

        Args:
            prompt: Input prompt
            tools: List of tool definitions
            model: Model name
            temperature: Sampling temperature
            **kwargs: Additional options

        Returns:
            Dict with 'text' and 'tool_calls'
        """
        model_name = model or "gemini-2.5-flash"
        model_name = self._resolve_model_name(model_name)
        temp = temperature if temperature is not None else 0.0

        try:
            # Convert tools to Gemini format (list of dicts)
            gemini_tools = self._convert_tools_to_gemini(tools) if tools else None

            # Build config
            gen_config = {"temperature": temp, "max_output_tokens": 8192}

            # Use new SDK async API with tools
            if gemini_tools:
                response = await self.client.aio.models.generate_content(
                    model=model_name, contents=prompt, config=gen_config, tools=gemini_tools
                )
            else:
                response = await self.client.aio.models.generate_content(
                    model=model_name, contents=prompt, config=gen_config
                )

            # Extract text and tool calls
            text = ""
            tool_calls = []

            if response.candidates:
                candidate = response.candidates[0]

                if hasattr(candidate, "content") and candidate.content:
                    for part in candidate.content.parts:
                        if hasattr(part, "text") and part.text:
                            text += part.text
                        elif hasattr(part, "function_call"):
                            fc = part.function_call
                            tool_calls.append(
                                {
                                    "id": f"call_{len(tool_calls)}",
                                    "name": fc.name,
                                    "args": dict(fc.args) if fc.args else {},
                                }
                            )

            self.logger.info(
                "tool_generation_completed",
                model=model_name,
                tool_calls=len(tool_calls),
                has_text=bool(text),
            )

            return {"text": text, "tool_calls": tool_calls}

        except Exception as e:
            self.logger.error("tool_generation_failed", model=model_name, error=str(e))
            raise

    def _convert_tools_to_gemini(self, tools: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Convert tool definitions to Gemini format.

        The new google-genai SDK accepts tools as dicts.
        """
        if not tools:
            return []

        function_declarations = []
        for tool in tools:
            fd = {
                "name": tool.get("name", ""),
                "description": tool.get("description", ""),
            }
            params = tool.get("parameters", {})
            if params:
                fd["parameters"] = params
            function_declarations.append(fd)

        return [{"function_declarations": function_declarations}]

    async def stream(
        self, prompt: str, config: Optional[GenerationConfig] = None, **kwargs
    ) -> AsyncGenerator[str, None]:
        """
        Stream generated text chunks

        Args:
            prompt: Input prompt
            config: Generation configuration
            **kwargs: Additional options

        Yields:
            Text chunks
        """
        config = config or GenerationConfig()
        model_name = self._resolve_model_name(config.model)

        try:
            gen_config = {
                "temperature": config.temperature,
                "max_output_tokens": config.max_tokens,
                "top_p": config.top_p,
                "top_k": config.top_k,
            }

            # Use async streaming
            async for chunk in self.client.aio.models.generate_content_stream(
                model=model_name, contents=prompt, config=gen_config
            ):
                if chunk.text:
                    yield chunk.text

        except Exception as e:
            self.logger.error("stream_failed", model=model_name, error=str(e))
            raise

    async def stream_with_tools(
        self,
        prompt: str,
        tools: List[Dict[str, Any]] = None,
        model: str = None,
        temperature: float = 0.0,
        **kwargs,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream responses with optional tool calling.

        True token-level streaming for chat applications.
        Yields chunks as they arrive from Gemini.

        Args:
            prompt: Input prompt
            tools: Optional list of tool definitions
            model: Model name (defaults to gemini-2.5-flash)
            temperature: Sampling temperature
            **kwargs: Additional options

        Yields:
            {"type": "text", "content": "chunk"}
            {"type": "tool_call", "name": "...", "args": {...}}
            {"type": "complete", "usage": {...}}
        """
        model_name = model or "gemini-2.5-flash"
        model_name = self._resolve_model_name(model_name)

        try:
            gemini_tools = self._convert_tools_to_gemini(tools) if tools else None

            gen_config = {"temperature": temperature, "max_output_tokens": 8192}

            # Track usage and tool calls
            total_text = ""
            tool_calls = []

            # Use async streaming with tools
            if gemini_tools:
                stream = self.client.aio.models.generate_content_stream(
                    model=model_name, contents=prompt, config=gen_config, tools=gemini_tools
                )
            else:
                stream = self.client.aio.models.generate_content_stream(
                    model=model_name, contents=prompt, config=gen_config
                )

            async for chunk in stream:
                if not chunk.candidates:
                    continue

                candidate = chunk.candidates[0]

                # Handle content parts
                if hasattr(candidate, "content") and candidate.content:
                    for part in candidate.content.parts:
                        # Text chunk
                        if hasattr(part, "text") and part.text:
                            total_text += part.text
                            yield {"type": "text", "content": part.text}

                        # Tool call
                        elif hasattr(part, "function_call"):
                            fc = part.function_call
                            tool_call = {
                                "id": f"call_{len(tool_calls)}",
                                "name": fc.name,
                                "args": dict(fc.args) if fc.args else {},
                            }
                            tool_calls.append(tool_call)
                            yield {"type": "tool_call", "name": fc.name, "args": tool_call["args"]}

            # Final completion message
            yield {
                "type": "complete",
                "text": total_text,
                "tool_calls": tool_calls,
                "usage": {},
                "model": model_name,
            }

            self.logger.info(
                "stream_with_tools_completed",
                model=model_name,
                text_length=len(total_text),
                tool_calls=len(tool_calls),
            )

        except Exception as e:
            self.logger.error("stream_with_tools_failed", model=model_name, error=str(e))
            yield {"type": "error", "message": str(e)}

    def count_tokens(self, text: str) -> int:
        """
        Count tokens in text

        Args:
            text: Text to count

        Returns:
            Token count (approximate)
        """
        try:
            # Use new SDK's count_tokens
            result = self.client.models.count_tokens(model="gemini-2.0-flash", contents=text)
            return result.total_tokens
        except Exception:
            # Fallback: rough estimate (1 token ≈ 4 chars)
            return len(text) // 4
