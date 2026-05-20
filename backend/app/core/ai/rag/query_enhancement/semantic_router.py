"""
MiniLM Semantic Router — Intent-aware query classification for HyDE gating.

Replaces the keyword-only fallback in QueryAnalyzer._classify_type() for the
HyDE gating decision. The keyword analyzer still drives retrieval_top_k and
the adaptive k logic — this router only overrides query_type for the
strategy_by_type dict in rag_pipeline.py (L435-443).

Problem it solves:
    QueryAnalyzer._classify_type() defaults to FACTUAL when no trigger keywords
    match. A query like "Explain the relationship between struggle and meaning"
    has none of the trigger keywords → classified FACTUAL → HyDE skipped.
    This router classifies it as CONCEPTUAL with high confidence → HyDE fires.
    The semantic gap (question→answer embedding mismatch) is bridged correctly.

Design:
    - Load all-MiniLM-L6-v2 (already in .model_cache, no download needed)
    - Embed 8-10 example phrases per category at singleton init (~200ms, cached)
    - At query time: embed query → cosine similarity over all examples → argmax
    - Query-time cost: < 1ms (pure numpy dot product over ~40 vectors)

Categories and their RAG pipeline effect:
    conceptual → EnhancementStrategy.HYDE  (bridges question→answer gap)
    factual    → skips LLM enhancement     (keyword match is sufficient)
    quiz       → future: routes to quiz agent (no pipeline effect yet)
    tutor      → future: routes to tutor agent (no pipeline effect yet)

Confidence thresholds:
    >= 0.55 → route with confidence (override keyword classification)
    0.45-0.55 → ambiguous zone: keep keyword classification result
    < 0.45  → very low confidence: keep keyword classification result

The router NEVER overrides for quiz/tutor categories — those affect agent
routing not RAG strategy, and agent routing is handled separately.
Only CONCEPTUAL vs FACTUAL distinction is acted upon here.
"""

import os
import numpy as np
import structlog
from typing import Optional, Tuple, List

logger = structlog.get_logger(__name__)

# Example phrases per category — representative, not exhaustive.
# Quality matters more than quantity. Each phrase should be a clear prototype
# of the category that is unlikely to be confused with others.
_EXAMPLES: dict[str, List[str]] = {
    "conceptual": [
        "explain the relationship between",
        "help me understand this concept",
        "what does this mean in the context of",
        "why does this happen",
        "what is the underlying principle",
        "how does this relate to",
        "can you explain what this is",
        "I don't understand why",
        "what is the significance of",
        "describe the nature of",
    ],
    "factual": [
        "what is the capital of",
        "when did this happen",
        "who wrote this",
        "where is this located",
        "name the components of",
        "how many",
        "list the steps",
        "what year was",
        "which one is",
        "define the term",
    ],
    "quiz": [
        "test me on",
        "quiz me about",
        "give me flashcards for",
        "create multiple choice questions",
        "make a practice test",
        "I want to be tested on",
        "check my knowledge of",
        "examine me on",
    ],
    "tutor": [
        "teach me how to",
        "walk me through",
        "help me learn",
        "explain step by step",
        "guide me through",
        "I want to learn",
        "can you tutor me on",
        "how do I get started with",
    ],
}

# Only these categories affect the RAG HyDE gating decision.
# quiz and tutor are classified but not yet acted upon in the pipeline.
_HYDE_TRIGGER_CATEGORIES = {"conceptual"}

# Confidence threshold to override keyword classification
_CONFIDENCE_THRESHOLD = 0.55


class MiniLMSemanticRouter:
    """
    Semantic query router using all-MiniLM-L6-v2 for intent classification.

    Thread-safe: model and example matrix are read-only after __init__.
    Safe for use in both async (FastAPI) and sync (Celery) contexts.

    Usage:
        router = get_semantic_router()
        category, confidence = router.classify("explain the role of mitochondria")
        # → ("conceptual", 0.82)
    """

    def __init__(self, cache_dir: Optional[str] = None) -> None:
        from sentence_transformers import SentenceTransformer

        if cache_dir is None:
            # Mirror the path used by all other ST models in the stack
            cache_dir = os.path.join(
                os.path.dirname(__file__), "..", "..", "..", "..", "..", ".model_cache"
            )
            cache_dir = os.path.normpath(cache_dir)

        logger.info(
            "semantic_router_loading",
            model="all-MiniLM-L6-v2",
            cache_dir=cache_dir,
        )

        self._model = SentenceTransformer(
            "sentence-transformers/all-MiniLM-L6-v2",
            device="cpu",
            cache_folder=cache_dir,
        )

        # Pre-embed all examples. Shape: (n_examples, 384).
        # Stored as a numpy matrix for fast batched cosine similarity.
        self._categories: List[str] = []
        self._example_embeddings: np.ndarray = np.empty((0, 384), dtype=np.float32)

        all_texts: List[str] = []
        all_labels: List[str] = []
        for category, phrases in _EXAMPLES.items():
            for phrase in phrases:
                all_texts.append(phrase)
                all_labels.append(category)

        raw = self._model.encode(
            all_texts,
            normalize_embeddings=True,
            show_progress_bar=False,
            convert_to_numpy=True,
        ).astype(np.float32)

        self._categories = all_labels
        self._example_embeddings = raw

        logger.info(
            "semantic_router_ready",
            n_examples=len(all_texts),
            categories=list(_EXAMPLES.keys()),
        )

    def classify(self, query: str) -> Tuple[str, float]:
        """
        Classify a query into a routing category.

        Args:
            query: Raw user query string.

        Returns:
            (category, confidence) where confidence is the cosine similarity
            to the nearest example. Higher is more confident.

        Examples:
            classify("explain the relationship between struggle and meaning")
            → ("conceptual", 0.78)

            classify("what year was the French Revolution")
            → ("factual", 0.81)
        """
        query_emb = self._model.encode(
            [query],
            normalize_embeddings=True,
            show_progress_bar=False,
            convert_to_numpy=True,
        ).astype(np.float32)

        # Cosine similarity: since both are L2-normalized, dot product == cosine
        sims = (self._example_embeddings @ query_emb[0])  # shape (n_examples,)

        best_idx = int(np.argmax(sims))
        best_sim = float(sims[best_idx])
        best_category = self._categories[best_idx]

        logger.debug(
            "semantic_router_classification",
            query_preview=query[:60],
            category=best_category,
            confidence=round(best_sim, 3),
        )

        return best_category, best_sim

    def should_use_hyde(self, query: str, keyword_query_type: str) -> str:
        """
        Determine the effective query_type for HyDE gating.

        Runs semantic classification. If confidence >= threshold AND the semantic
        category is in _HYDE_TRIGGER_CATEGORIES, returns "conceptual" to trigger
        HyDE regardless of what the keyword classifier said.

        If confidence is below threshold or the semantic category doesn't affect
        HyDE, returns the original keyword_query_type unchanged.

        Args:
            query: Raw user query.
            keyword_query_type: Result from QueryAnalyzer.analyze()["type"].

        Returns:
            Effective query_type string ("conceptual", "factual", etc.)
        """
        try:
            category, confidence = self.classify(query)
        except Exception as e:
            logger.warning("semantic_router_classify_failed", error=str(e))
            return keyword_query_type

        if confidence >= _CONFIDENCE_THRESHOLD and category in _HYDE_TRIGGER_CATEGORIES:
            if keyword_query_type != category:
                logger.info(
                    "semantic_router_override",
                    keyword_type=keyword_query_type,
                    semantic_type=category,
                    confidence=round(confidence, 3),
                    effect="hyde_enabled",
                )
            return category

        # Below threshold or not a HyDE-triggering category — preserve keyword result
        return keyword_query_type


# =============================================================================
# Singleton
# =============================================================================

_router: Optional[MiniLMSemanticRouter] = None


def get_semantic_router() -> MiniLMSemanticRouter:
    """
    Get the process-level MiniLMSemanticRouter singleton.

    Lazy-initialized on first call. Example embeddings are computed once and
    cached for the process lifetime. Thread-safe after init (read-only state).
    """
    global _router
    if _router is None:
        from app.core.ai.rag.config.model_config import get_model_config
        config = get_model_config()
        _router = MiniLMSemanticRouter(cache_dir=config.model_cache_dir)
    return _router
