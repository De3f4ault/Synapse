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
        llm_provider: str = "litellm",   # kept for API compatibility, ignored
        model: str = "synapse-utility",  # LiteLLM alias with auto-fallback
        temperature: float = 0.3,
        max_tokens: int = 500,
        enable_caching: bool = True,
        ollama_fallback_model: Optional[str] = None,  # kept for API compat, ignored
    ):
        """
        Initialize LLM query expander.

        Uses LiteLLM Router (synapse-utility alias) which:
        - Routes to gemini-2.5-flash-lite as primary (4s timeout)
        - Auto-falls back to ollama/gemma4:31b-cloud on failure
        No manual per-SDK setup required.
        """
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.enable_caching = enable_caching
        # Deferred import: litellm_router → litellm (~8s). Only instantiated during _init_rag.
        from app.core.ai.providers.litellm_router import get_llm_router
        self._router = get_llm_router()
        self._model_alias = model if "/" in model or model.startswith("synapse-") else "synapse-utility"
        self._cache: Dict[str, str] = {}
        logger.info("llm_expander_initialized", model_alias=self._model_alias)

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

        # Call LiteLLM — timeout and Ollama fallback handled natively by the Router
        result_text = await self._call_llm(prompt)

        if result_text:
            if self.enable_caching:
                self._cache[cache_key] = result_text
            result = self._parse_response(result_text, strategy)
            logger.info(
                "query_enhanced",
                strategy=strategy.value,
                original_length=len(query),
                enhanced=result if isinstance(result, str) else f"{len(result)} queries",
            )
            return result

        # LLM failed entirely — return original query to avoid blocking search
        logger.warning(
            "llm_enhancement_failed_returning_original",
            strategy=strategy.value,
        )
        return query if strategy in (EnhancementStrategy.REWRITE, EnhancementStrategy.HYDE) else [query]

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
        """
        Call LiteLLM with the synapse-utility alias.

        The Router handles:
        - Primary: gemini/gemini-2.5-flash-lite (6s timeout)
        - Fallback: ollama/gemma4:31b-cloud (auto on any failure)
        - Cooldown per deployment after repeated failures

        Returns:
            Generated text, or empty string on failure.
        """
        _SYSTEM = "You are an educational content expert helping students learn more effectively."
        try:
            response = await self._router.acompletion(
                model=self._model_alias,
                messages=[
                    {"role": "system", "content": _SYSTEM},
                    {"role": "user", "content": prompt},
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens,
            )
            return (response.choices[0].message.content or "").strip()
        except Exception as err:
            logger.warning(
                "llm_expander_call_failed",
                model=self._model_alias,
                error=str(err)[:120],
            )
            return ""


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
