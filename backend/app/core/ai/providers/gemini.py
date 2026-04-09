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
from app.core.ai.registry.models import (
    DEFAULT_CACHE_MODEL,
    DEFAULT_CHAT_MODEL,
    DEFAULT_GENERATION_MODEL,
    DEFAULT_TOKENIZER_MODEL,
)
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
    CHAT_MODEL = DEFAULT_CHAT_MODEL
    GENERATION_MODEL = DEFAULT_GENERATION_MODEL
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

    # =========================================================================
    # CONTEXT CACHING (Cost Optimization for Large Documents)
    # =========================================================================

    async def create_context_cache(
        self,
        display_name: str,
        contents: Any,
        model: str = DEFAULT_CACHE_MODEL,
        system_instruction: Optional[str] = None,
        ttl_seconds: int = 3600,
    ) -> str:
        """
        Create a context cache for large content (documents, videos, etc.)

        Context caching reduces costs by storing frequently-used content
        server-side, avoiding repeated token transmission.

        Args:
            display_name: Human-readable name for the cache
            contents: Content to cache (text, file object, or list of parts)
            model: Model to use - MUST be versioned (e.g., "gemini-2.0-flash-001")
            system_instruction: Optional system instruction to cache with content
            ttl_seconds: Time to live in seconds (default 1 hour)

        Returns:
            Cache resource name (use this in generate_with_cache)

        Example:
            cache_name = await provider.create_context_cache(
                display_name="biology_textbook",
                contents=document_text,
                system_instruction="You are a biology tutor",
                ttl_seconds=3600
            )
        """
        from google.genai import types

        try:
            # Build cache config
            cache_config = types.CreateCachedContentConfig(
                display_name=display_name,
                contents=contents if isinstance(contents, list) else [contents],
                ttl=f"{ttl_seconds}s",
            )

            # Add system instruction if provided
            if system_instruction:
                cache_config.system_instruction = system_instruction

            # Create cache synchronously (SDK doesn't have async caches.create)
            cache = self.client.caches.create(model=model, config=cache_config)

            self.logger.info(
                "context_cache_created",
                cache_name=cache.name,
                display_name=display_name,
                model=model,
                ttl_seconds=ttl_seconds,
            )

            return cache.name

        except Exception as e:
            self.logger.error(
                "context_cache_creation_failed", display_name=display_name, error=str(e)
            )
            raise

    async def get_cache(self, cache_name: str) -> Optional[Dict[str, Any]]:
        """
        Get cache metadata by name.

        Args:
            cache_name: Cache resource name

        Returns:
            Cache metadata dict or None if not found
        """
        try:
            cache = self.client.caches.get(name=cache_name)
            return {
                "name": cache.name,
                "display_name": cache.display_name,
                "model": cache.model,
                "create_time": str(cache.create_time) if cache.create_time else None,
                "expire_time": str(cache.expire_time) if cache.expire_time else None,
                "usage_metadata": cache.usage_metadata,
            }
        except Exception as e:
            self.logger.warning("cache_get_failed", cache_name=cache_name, error=str(e))
            return None

    async def list_caches(self) -> List[Dict[str, Any]]:
        """
        List all cached content.

        Returns:
            List of cache metadata dicts
        """
        caches = []
        try:
            for cache in self.client.caches.list():
                caches.append(
                    {
                        "name": cache.name,
                        "display_name": cache.display_name,
                        "model": cache.model,
                        "expire_time": str(cache.expire_time) if cache.expire_time else None,
                    }
                )
            self.logger.debug("caches_listed", count=len(caches))
        except Exception as e:
            self.logger.error("cache_list_failed", error=str(e))
        return caches

    async def update_cache_ttl(self, cache_name: str, ttl_seconds: int) -> bool:
        """
        Update cache TTL.

        Args:
            cache_name: Cache resource name
            ttl_seconds: New TTL in seconds

        Returns:
            True if successful
        """
        from google.genai import types

        try:
            self.client.caches.update(
                name=cache_name, config=types.UpdateCachedContentConfig(ttl=f"{ttl_seconds}s")
            )
            self.logger.info("cache_ttl_updated", cache_name=cache_name, ttl=ttl_seconds)
            return True
        except Exception as e:
            self.logger.error("cache_ttl_update_failed", cache_name=cache_name, error=str(e))
            return False

    async def delete_cache(self, cache_name: str) -> bool:
        """
        Delete a cache.

        Args:
            cache_name: Cache resource name

        Returns:
            True if successful
        """
        try:
            self.client.caches.delete(cache_name)
            self.logger.info("cache_deleted", cache_name=cache_name)
            return True
        except Exception as e:
            self.logger.error("cache_delete_failed", cache_name=cache_name, error=str(e))
            return False

    async def generate_with_cache(
        self,
        cache_name: str,
        prompt: str,
        config: Optional[GenerationConfig] = None,
    ) -> ProviderResponse:
        """
        Generate content using a cached context.

        Args:
            cache_name: Cache resource name from create_context_cache
            prompt: User prompt (only the new query, not the cached content)
            config: Optional generation config

        Returns:
            ProviderResponse with generated text and usage showing cache hits
        """
        from google.genai import types

        config = config or GenerationConfig()

        try:
            # Get model from cache
            cache = self.client.caches.get(name=cache_name)
            model_name = cache.model

            # Build generation config with cached content
            gen_config = types.GenerateContentConfig(
                cached_content=cache_name,
                temperature=config.temperature,
                max_output_tokens=config.max_tokens,
            )

            # Generate using cache
            response = await self.client.aio.models.generate_content(
                model=model_name, contents=prompt, config=gen_config
            )

            text = response.text if response.text else ""

            # Extract usage with cache hit info
            usage = {}
            if hasattr(response, "usage_metadata") and response.usage_metadata:
                usage = {
                    "prompt_tokens": getattr(response.usage_metadata, "prompt_token_count", 0),
                    "cached_tokens": getattr(
                        response.usage_metadata, "cached_content_token_count", 0
                    ),
                    "completion_tokens": getattr(
                        response.usage_metadata, "candidates_token_count", 0
                    ),
                    "total_tokens": getattr(response.usage_metadata, "total_token_count", 0),
                }

            self.logger.info(
                "cached_generation_completed",
                cache_name=cache_name,
                cached_tokens=usage.get("cached_tokens", 0),
                response_length=len(text),
            )

            return ProviderResponse(
                text=text, tool_calls=[], finish_reason="stop", usage=usage, model=model_name
            )

        except Exception as e:
            self.logger.error("cached_generation_failed", cache_name=cache_name, error=str(e))
            raise

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
        model_name = model or DEFAULT_CHAT_MODEL
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

            # Use async streaming (await to get the async generator)
            stream = await self.client.aio.models.generate_content_stream(
                model=model_name, contents=prompt, config=gen_config
            )
            async for chunk in stream:
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
        model_name = model or DEFAULT_CHAT_MODEL
        model_name = self._resolve_model_name(model_name)

        try:
            gemini_tools = self._convert_tools_to_gemini(tools) if tools else None

            # Build config dict - tools go in config, not as separate arg
            gen_config = {"temperature": temperature, "max_output_tokens": 8192}
            if gemini_tools:
                gen_config["tools"] = gemini_tools

            # Track usage and tool calls
            total_text = ""
            tool_calls = []

            # Build contents — multimodal if images provided
            image_bytes_list = kwargs.get("image_bytes")
            if image_bytes_list:
                from google.genai import types
                import imghdr

                # MIME type detection from bytes
                def _detect_mime(data: bytes) -> str:
                    img_type = imghdr.what(None, h=data)
                    mime_map = {
                        "png": "image/png",
                        "jpeg": "image/jpeg",
                        "gif": "image/gif",
                        "webp": "image/webp",
                    }
                    return mime_map.get(img_type, "image/png")

                contents = [types.Part.from_text(text=prompt)]
                for img_data in image_bytes_list:
                    mime = _detect_mime(img_data)
                    contents.append(
                        types.Part.from_bytes(data=img_data, mime_type=mime)
                    )

                self.logger.info(
                    "gemini_injecting_images",
                    model=model_name,
                    count=len(image_bytes_list),
                )
            else:
                contents = prompt

            # Use async streaming (tools are in config)
            stream = await self.client.aio.models.generate_content_stream(
                model=model_name, contents=contents, config=gen_config
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
            result = self.client.models.count_tokens(model=DEFAULT_TOKENIZER_MODEL, contents=text)
            return result.total_tokens
        except Exception:
            # Fallback: rough estimate (1 token ≈ 4 chars)
            return len(text) // 4
