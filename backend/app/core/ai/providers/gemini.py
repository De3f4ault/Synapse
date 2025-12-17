"""
Gemini Provider - Google Gemini AI integration

Implements the BaseProvider interface for Google's Gemini models.
Supports text generation, function calling, and streaming.
"""

import asyncio
import datetime
from typing import Any, Dict, List, Optional, AsyncGenerator
import structlog
import google.generativeai as genai
from google.generativeai import caching
from google.generativeai.types import GenerationConfig as GeminiGenConfig
from google.generativeai.types import FunctionDeclaration, Tool

from app.core.config import settings
from app.core.ai.providers.base import (
    BaseProvider,
    GenerationConfig,
    ProviderResponse
)

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
        genai.configure(api_key=self.api_key)
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
        
        Args:
            name: Unique name for the cache
            content: Content to cache (file object, text, etc)
            model: Model to use with cache
            ttl_minutes: Time to live in minutes
            
        Returns:
            Cache name/resource identifier
        """
        try:
            # Run in executor
            loop = asyncio.get_event_loop()
            cache = await loop.run_in_executor(
                None,
                lambda: caching.CachedContent.create(
                    model=model,
                    display_name=name,
                    system_instruction=None,
                    contents=[content],
                    ttl=datetime.timedelta(minutes=ttl_minutes),
                )
            )
            
            self.logger.info(
                "context_cache_created",
                name=cache.name,
                model=model,
                ttl=ttl_minutes
            )
            return cache.name
            
        except Exception as e:
            self.logger.error("cache_creation_failed", error=str(e))
            raise

    def _resolve_model_name(self, model_name: str) -> str:
        """Resolve model aliases to actual model names"""
        return self.MODEL_ALIASES.get(model_name, model_name)

    def _get_model(self, model_name: str = "gemini-2.5-flash"):
        """Get Gemini model instance"""
        resolved_name = self._resolve_model_name(model_name)
        return genai.GenerativeModel(resolved_name)

    async def generate(
        self,
        prompt: str,
        config: Optional[GenerationConfig] = None,
        **kwargs
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

        try:
            model = self._get_model(config.model)

            gen_config = GeminiGenConfig(
                temperature=config.temperature,
                max_output_tokens=config.max_tokens,
                top_p=config.top_p,
                top_k=config.top_k,
                stop_sequences=config.stop_sequences or None
            )

            # Add thinking config if budget provided
            if config.thinking_budget:
                # Note: This is a hypothetical API for Gemini 2.5 thinking
                # Adjust based on final API spec when released
                gen_config.thinking_config = {"budget_tokens": config.thinking_budget}

            # Run in executor to avoid blocking
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: model.generate_content(
                    prompt,
                    generation_config=gen_config
                )
            )

            text = response.text if response.text else ""

            # Extract usage if available
            usage = {}
            if hasattr(response, 'usage_metadata'):
                usage = {
                    "prompt_tokens": getattr(response.usage_metadata, 'prompt_token_count', 0),
                    "completion_tokens": getattr(response.usage_metadata, 'candidates_token_count', 0),
                    "total_tokens": getattr(response.usage_metadata, 'total_token_count', 0)
                }

            self.logger.info(
                "generation_completed",
                model=config.model,
                prompt_length=len(prompt),
                response_length=len(text)
            )

            return ProviderResponse(
                text=text,
                tool_calls=[],
                finish_reason="stop",
                usage=usage,
                model=config.model
            )

        except Exception as e:
            self.logger.error(
                "generation_failed",
                model=config.model,
                error=str(e)
            )
            raise

    async def generate_with_tools(
        self,
        prompt: str,
        tools: List[Dict[str, Any]],
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        **kwargs
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
            # Convert tools to Gemini format
            gemini_tools = self._convert_tools_to_gemini(tools) if tools else None

            gemini_model = self._get_model(model_name)

            gen_config = GeminiGenConfig(
                temperature=temp,
                max_output_tokens=8192
            )

            # Run in executor
            loop = asyncio.get_event_loop()

            if gemini_tools:
                response = await loop.run_in_executor(
                    None,
                    lambda: gemini_model.generate_content(
                        prompt,
                        generation_config=gen_config,
                        tools=gemini_tools
                    )
                )
            else:
                response = await loop.run_in_executor(
                    None,
                    lambda: gemini_model.generate_content(
                        prompt,
                        generation_config=gen_config
                    )
                )

            # Extract text and tool calls
            text = ""
            tool_calls = []

            if response.candidates:
                candidate = response.candidates[0]

                for part in candidate.content.parts:
                    if hasattr(part, 'text') and part.text:
                        text += part.text
                    elif hasattr(part, 'function_call'):
                        fc = part.function_call
                        tool_calls.append({
                            "id": f"call_{len(tool_calls)}",
                            "name": fc.name,
                            "args": dict(fc.args) if fc.args else {}
                        })

            self.logger.info(
                "tool_generation_completed",
                model=model_name,
                tool_calls=len(tool_calls),
                has_text=bool(text)
            )

            return {
                "text": text,
                "tool_calls": tool_calls
            }

        except Exception as e:
            self.logger.error(
                "tool_generation_failed",
                model=model_name,
                error=str(e)
            )
            raise

    def _convert_tools_to_gemini(self, tools: List[Dict[str, Any]]) -> List[Tool]:
        """Convert tool definitions to Gemini format"""
        if not tools:
            return []

        function_declarations = []

        for tool in tools:
            # Convert parameters schema
            params = tool.get("parameters", {})

            fd = FunctionDeclaration(
                name=tool.get("name", ""),
                description=tool.get("description", ""),
                parameters=params if params else None
            )
            function_declarations.append(fd)

        return [Tool(function_declarations=function_declarations)]

    async def stream(
        self,
        prompt: str,
        config: Optional[GenerationConfig] = None,
        **kwargs
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

        try:
            model = self._get_model(config.model)

            gen_config = GeminiGenConfig(
                temperature=config.temperature,
                max_output_tokens=config.max_tokens,
                top_p=config.top_p,
                top_k=config.top_k
            )

            # Run streaming in executor
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: model.generate_content(
                    prompt,
                    generation_config=gen_config,
                    stream=True
                )
            )

            for chunk in response:
                if chunk.text:
                    yield chunk.text

        except Exception as e:
            self.logger.error(
                "stream_failed",
                model=config.model,
                error=str(e)
            )
            raise

    async def stream_with_tools(
        self,
        prompt: str,
        tools: List[Dict[str, Any]] = None,
        model: str = None,
        temperature: float = 0.0,
        **kwargs
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
            gemini_model = self._get_model(model_name)
            gemini_tools = self._convert_tools_to_gemini(tools) if tools else None

            gen_config = GeminiGenConfig(
                temperature=temperature,
                max_output_tokens=8192
            )

            # Run streaming in executor
            loop = asyncio.get_event_loop()
            
            if gemini_tools:
                response = await loop.run_in_executor(
                    None,
                    lambda: gemini_model.generate_content(
                        prompt,
                        generation_config=gen_config,
                        tools=gemini_tools,
                        stream=True
                    )
                )
            else:
                response = await loop.run_in_executor(
                    None,
                    lambda: gemini_model.generate_content(
                        prompt,
                        generation_config=gen_config,
                        stream=True
                    )
                )

            # Track usage and tool calls
            total_text = ""
            tool_calls = []

            # Stream chunks as they arrive
            for chunk in response:
                if not chunk.candidates:
                    continue

                candidate = chunk.candidates[0]
                
                # Handle content parts
                if hasattr(candidate, 'content') and candidate.content:
                    for part in candidate.content.parts:
                        # Text chunk
                        if hasattr(part, 'text') and part.text:
                            total_text += part.text
                            yield {
                                "type": "text",
                                "content": part.text
                            }
                        
                        # Tool call
                        elif hasattr(part, 'function_call'):
                            fc = part.function_call
                            tool_call = {
                                "id": f"call_{len(tool_calls)}",
                                "name": fc.name,
                                "args": dict(fc.args) if fc.args else {}
                            }
                            tool_calls.append(tool_call)
                            yield {
                                "type": "tool_call",
                                "name": fc.name,
                                "args": tool_call["args"]
                            }

            # Final completion message with usage
            usage = {}
            if hasattr(response, 'usage_metadata'):
                usage = {
                    "prompt_tokens": getattr(response.usage_metadata, 'prompt_token_count', 0),
                    "completion_tokens": getattr(response.usage_metadata, 'candidates_token_count', 0),
                    "total_tokens": getattr(response.usage_metadata, 'total_token_count', 0)
                }

            yield {
                "type": "complete",
                "text": total_text,
                "tool_calls": tool_calls,
                "usage": usage,
                "model": model_name
            }

            self.logger.info(
                "stream_with_tools_completed",
                model=model_name,
                text_length=len(total_text),
                tool_calls=len(tool_calls)
            )

        except Exception as e:
            self.logger.error(
                "stream_with_tools_failed",
                model=model_name,
                error=str(e)
            )
            yield {
                "type": "error",
                "message": str(e)
            }

    def count_tokens(self, text: str) -> int:
        """
        Count tokens in text

        Args:
            text: Text to count

        Returns:
            Token count (approximate)
        """
        try:
            model = self._get_model("gemini-2.5-flash")
            result = model.count_tokens(text)
            return result.total_tokens
        except Exception:
            # Fallback: rough estimate (1 token ≈ 4 chars)
            return len(text) // 4
