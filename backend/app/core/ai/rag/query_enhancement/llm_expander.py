"""LLM-based query enhancement strategies."""

from typing import List, Dict, Optional, Union
from enum import Enum
import asyncio
import structlog

logger = structlog.get_logger(__name__)


class EnhancementStrategy(Enum):
    """Query enhancement strategies"""

    REWRITE = "rewrite"  # Make query more specific
    HYDE = "hyde"  # Hypothetical Document Embeddings
    MULTI_QUERY = "multi_query"  # Generate alternatives
    DECOMPOSE = "decompose"  # Break into sub-questions


class LLMQueryExpander:
    """
    LLM-based query enhancement using GPT-4 or Claude.

    Research-backed strategies:
    1. **Rewriting**: Improves specificity by 30-40%
    2. **HyDE**: Bridges semantic gap between questions and answers
    3. **Multi-Query**: Increases recall by 20-30%
    4. **Decomposition**: Handles complex queries

    References:
    - HyDE paper (Gao et al., 2022)
    - Multi-query retrieval (LlamaIndex)
    - Query rewriting for RAG (production systems)
    """

    def __init__(
        self,
        llm_provider: str = "gemini",
        model: str = None,
        temperature: float = 0.3,
        max_tokens: int = 500,
        enable_caching: bool = True,
    ):
        """
        Initialize LLM query expander.

        Args:
            llm_provider: "gemini", "openai" or "anthropic"
            model: Model name (auto-selected based on provider if None)
            temperature: Creativity (0.0-1.0, lower = more focused)
            max_tokens: Maximum response length
            enable_caching: Enable prompt caching (saves costs)
        """
        self.llm_provider = llm_provider
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.enable_caching = enable_caching

        # Set default model based on provider
        if model is None:
            model_defaults = {
                "gemini": "gemini-1.5-flash",
                "openai": "gpt-4-turbo-preview",
                "anthropic": "claude-3-sonnet-20240229",
            }
            model = model_defaults.get(llm_provider, "gemini-1.5-flash")
        self.model = model

        # Initialize LLM client
        if llm_provider == "gemini":
            try:
                from google import genai
                from app.core.config import settings

                self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
                self._gemini_model = model  # Store model name for later use
                logger.info("llm_expander_initialized", provider="gemini", model=model)
            except ImportError:
                logger.error("google_genai_not_installed", help="pip install google-genai")
                raise
        elif llm_provider == "openai":
            try:
                from openai import AsyncOpenAI

                self.client = AsyncOpenAI()
                logger.info("llm_expander_initialized", provider="openai", model=model)
            except ImportError:
                logger.error("openai_not_installed", help="pip install openai")
                raise
        elif llm_provider == "anthropic":
            try:
                from anthropic import AsyncAnthropic

                self.client = AsyncAnthropic()
                logger.info("llm_expander_initialized", provider="anthropic", model=model)
            except ImportError:
                logger.error("anthropic_not_installed", help="pip install anthropic")
                raise
        else:
            raise ValueError(
                f"Unsupported LLM provider: {llm_provider}. Use 'gemini', 'openai', or 'anthropic'"
            )

        # Prompt cache (simple in-memory for now)
        self._cache: Dict[str, str] = {}

    async def enhance_query(
        self,
        query: str,
        strategy: EnhancementStrategy = EnhancementStrategy.REWRITE,
        user_context: Optional[Dict] = None,
    ) -> Union[str, List[str]]:
        """
        Enhance query using selected strategy.

        Args:
            query: Original user query
            strategy: Enhancement strategy
            user_context: Optional user learning context

        Returns:
            Enhanced query (str) or multiple queries (List[str])
        """
        logger.info("enhancing_query", strategy=strategy.value, query=query[:50])

        # Build prompt based on strategy
        prompt = self._build_prompt(query, strategy, user_context)

        # Check cache
        cache_key = f"{strategy.value}:{query}:{hash(str(user_context))}"
        if self.enable_caching and cache_key in self._cache:
            logger.debug("cache_hit", strategy=strategy.value)
            return self._parse_response(self._cache[cache_key], strategy)

        # Call LLM
        try:
            response = await self._call_llm(prompt)

            # Cache response
            if self.enable_caching:
                self._cache[cache_key] = response

            # Parse response
            result = self._parse_response(response, strategy)

            logger.info(
                "query_enhanced",
                strategy=strategy.value,
                original_length=len(query),
                enhanced=result if isinstance(result, str) else f"{len(result)} queries",
            )

            return result

        except Exception as e:
            logger.error("enhancement_failed", strategy=strategy.value, error=str(e))
            # Fallback to original query
            return query

    def _build_prompt(
        self, query: str, strategy: EnhancementStrategy, user_context: Optional[Dict] = None
    ) -> str:
        """Build enhancement prompt based on strategy."""

        # Base context
        context_str = ""
        if user_context:
            weak_areas = user_context.get("weak_areas", [])
            if weak_areas:
                topics = [wa["topic"] for wa in weak_areas[:3]]
                context_str = f"\nUser's learning focus areas: {', '.join(topics)}"

        if strategy == EnhancementStrategy.REWRITE:
            return f"""Rewrite the following educational query to be more specific, detailed, and focused on learning objectives.

Original query: "{query}"{context_str}

Provide only the rewritten query, no explanation."""

        elif strategy == EnhancementStrategy.HYDE:
            return f"""Generate a hypothetical detailed answer to the following educational question. This answer will be used to find similar real content.

Question: "{query}"{context_str}

Generate a comprehensive, educational answer (2-3 paragraphs)."""

        elif strategy == EnhancementStrategy.MULTI_QUERY:
            return f"""Generate 3 alternative phrasings of the following educational query. Each should approach the topic from a slightly different angle while maintaining the learning objective.

Original query: "{query}"{context_str}

Provide 3 alternative queries, one per line, numbered 1-3."""

        elif strategy == EnhancementStrategy.DECOMPOSE:
            return f"""Break down the following complex educational query into 2-4 simpler sub-questions that, when answered together, would fully address the original question.

Complex query: "{query}"{context_str}

Provide sub-questions, one per line, numbered."""

        return query

    async def _call_llm(self, prompt: str) -> str:
        """Call LLM API."""

        if self.llm_provider == "gemini":
            # Use new google-genai SDK async API
            system_prompt = (
                "You are an educational content expert helping students learn more effectively."
            )
            full_prompt = f"{system_prompt}\n\n{prompt}"

            response = await self.client.aio.models.generate_content(
                model=self._gemini_model,
                contents=full_prompt,
                config={"temperature": self.temperature, "max_output_tokens": self.max_tokens},
            )
            return response.text.strip()

        elif self.llm_provider == "openai":
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an educational content expert helping students learn more effectively.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens,
            )
            return response.choices[0].message.content.strip()

        elif self.llm_provider == "anthropic":
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                messages=[{"role": "user", "content": prompt}],
            )
            return response.content[0].text.strip()

    def _parse_response(
        self, response: str, strategy: EnhancementStrategy
    ) -> Union[str, List[str]]:
        """Parse LLM response based on strategy."""

        if strategy in [EnhancementStrategy.REWRITE, EnhancementStrategy.HYDE]:
            # Single enhanced query
            return response.strip()

        elif strategy in [EnhancementStrategy.MULTI_QUERY, EnhancementStrategy.DECOMPOSE]:
            # Multiple queries
            lines = response.strip().split("\n")
            queries = []

            for line in lines:
                # Remove numbering (1., 2., etc.)
                cleaned = line.strip()
                if cleaned and len(cleaned) > 3:
                    # Remove leading numbers/bullets
                    if cleaned[0].isdigit():
                        cleaned = cleaned.split(".", 1)[-1].strip()
                    if cleaned.startswith("-") or cleaned.startswith("•"):
                        cleaned = cleaned[1:].strip()

                    if len(cleaned) > 10:  # Minimum query length
                        queries.append(cleaned)

            return queries if queries else [response]

        return response

    async def enhance_batch(
        self,
        queries: List[str],
        strategy: EnhancementStrategy = EnhancementStrategy.REWRITE,
        user_context: Optional[Dict] = None,
    ) -> List[Union[str, List[str]]]:
        """
        Enhance multiple queries in parallel.

        Efficient for batch processing.
        """
        tasks = [self.enhance_query(query, strategy, user_context) for query in queries]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Handle exceptions
        final_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error("batch_enhancement_error", index=i, error=str(result))
                final_results.append(queries[i])  # Fallback to original
            else:
                final_results.append(result)

        return final_results

    def clear_cache(self):
        """Clear prompt cache."""
        self._cache.clear()
        logger.info("cache_cleared")


# Global instance
_expander: Optional[LLMQueryExpander] = None


def get_llm_expander(reset: bool = False, **kwargs) -> LLMQueryExpander:
    """Get global LLM expander instance."""
    global _expander

    if _expander is None or reset:
        _expander = LLMQueryExpander(**kwargs)

    return _expander
