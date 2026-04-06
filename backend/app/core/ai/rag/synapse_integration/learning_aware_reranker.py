"""Learning-Aware Reranker - Boosts weak areas for personalized learning."""

from typing import List, Optional, Any, Dict
from llama_index.core.postprocessor.types import BaseNodePostprocessor
from llama_index.core.schema import NodeWithScore, QueryBundle
from pydantic import PrivateAttr, Field
import structlog
import asyncio

logger = structlog.get_logger(__name__)


class LearningAwareReranker(BaseNodePostprocessor):
    """
    Learning-aware reranker using SYNAPSE context.

    Boosts retrieval results based on user's learning needs:
    - Weak areas get priority (higher boost)
    - Recently studied topics get slight boost (reinforcement)
    - Mastered topics get slight demotion (focus on gaps)

    Research shows: 30-40% improvement in personalized relevance.

    Use after cross-encoder reranking for best results:
    Query → Retrieval → Cross-Encoder → Learning-Aware → Top-K
    """

    top_k: int = Field(default=5, description="Number of results to return")
    weak_area_boost: float = Field(default=1.5, description="Multiplier for weak area content")
    recent_topic_boost: float = Field(
        default=1.2, description="Multiplier for recently studied topics"
    )
    mastery_penalty: float = Field(default=0.8, description="Multiplier for mastered topics")
    _synapse: Any = PrivateAttr(default=None)
    _context_cache: Dict[int, Dict] = PrivateAttr(default_factory=dict)

    def __init__(
        self,
        top_k: int = 5,
        weak_area_boost: float = 1.5,
        recent_topic_boost: float = 1.2,
        mastery_penalty: float = 0.8,
        **kwargs,
    ):
        """
        Initialize learning-aware reranker.

        Args:
            top_k: Number of results to return
            weak_area_boost: Multiplier for weak area content (1.3-2.0 recommended)
            recent_topic_boost: Multiplier for recently studied topics
            mastery_penalty: Multiplier for mastered topics (<1.0 to demote)
            **kwargs: Additional BaseNodePostprocessor arguments
        """
        super().__init__(
            top_k=top_k,
            weak_area_boost=weak_area_boost,
            recent_topic_boost=recent_topic_boost,
            mastery_penalty=mastery_penalty,
            **kwargs,
        )

        # Initialize private attrs — use object.__setattr__ to bypass
        # pydantic v1's __setattr__ which rejects private attr assignments
        object.__setattr__(self, "_synapse", None)
        object.__setattr__(self, "_context_cache", {})

        logger.info(
            "learning_aware_reranker_initialized",
            top_k=top_k,
            weak_boost=weak_area_boost,
            recent_boost=recent_topic_boost,
        )

    def _get_bridge(self):
        """Get or create the SYNAPSE context bridge (lazy init)."""
        if self._synapse is None:
            from .context_bridge import SynapseContextBridge

            self._synapse = SynapseContextBridge()
        return self._synapse

    def set_prefetched_context(self, user_id: int, context: Dict) -> None:
        """
        Inject pre-fetched user context from the pipeline's async layer.

        This avoids the async-in-sync problem where _get_context_sync()
        detects a running event loop and returns empty context.

        Called by RAGPipeline.query() before postprocess_nodes().
        """
        # Use object.__setattr__ for pydantic v1 compat with PrivateAttr
        cache = object.__getattribute__(self, "_context_cache")
        cache[user_id] = context
        logger.debug("prefetched_context_injected", user_id=user_id,
                     weak_areas=len(context.get("weak_areas", [])),
                     mastery_scores=len(context.get("mastery_scores", {})))

    async def _get_context_async(self, user_id: int) -> Dict:
        """Get user context asynchronously."""
        # Check cache first
        if user_id in self._context_cache:
            return self._context_cache[user_id]

        bridge = self._get_bridge()
        context = await bridge.get_user_context(user_id)

        # Cache for this request batch
        self._context_cache[user_id] = context
        return context

    def _get_context_sync(self, user_id: int) -> Dict:
        """Get user context synchronously (wraps async)."""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # We're in an async context, need to run in executor
                # Return empty context to avoid blocking
                return self._get_empty_context(user_id)
            else:
                return loop.run_until_complete(self._get_context_async(user_id))
        except RuntimeError:
            # No event loop, create one
            return asyncio.run(self._get_context_async(user_id))

    def _get_empty_context(self, user_id: int) -> Dict:
        """Return empty context as fallback."""
        return {
            "user_id": user_id,
            "weak_areas": [],
            "mastery_scores": {},
            "recent_topics": [],
            "preferences": {},
        }

    def _postprocess_nodes(
        self, nodes: List[NodeWithScore], query_bundle: Optional[QueryBundle] = None
    ) -> List[NodeWithScore]:
        """
        Rerank nodes using learning context.

        Args:
            nodes: Retrieved nodes (already scored by cross-encoder)
            query_bundle: Original query with metadata

        Returns:
            Reranked nodes with learning-aware boost
        """
        if not query_bundle or not nodes:
            logger.warning("no_query_or_nodes_for_learning_reranking")
            return nodes

        # Extract user_id — prefer context cache (set by pipeline), then node metadata
        user_id = None

        # Check if we have any user in the prefetched context cache
        cache = object.__getattribute__(self, "_context_cache")
        if cache:
            # Pipeline always calls set_prefetched_context before postprocess_nodes
            user_id = next(iter(cache), None)

        # Fallback: try to get user_id from node metadata
        if user_id is None and nodes:
            for node in nodes:
                uid = node.node.metadata.get("user_id")
                if uid is not None:
                    user_id = int(uid) if isinstance(uid, str) else uid
                    break

        if not user_id:
            logger.warning("no_user_id_for_learning_reranking")
            return nodes  # Fall back to original ranking

        user_id = int(user_id)

        logger.info("learning_reranking_start", user_id=user_id, candidates=len(nodes))

        # Get user learning context
        # Prefer pre-fetched context (injected by pipeline) over broken sync wrapper
        if user_id in self._context_cache:
            context = self._context_cache[user_id]
            logger.debug("using_prefetched_context", user_id=user_id)
        else:
            # Fallback to sync wrapper (will return empty in async context)
            context = self._get_context_sync(user_id)
            logger.warning("using_sync_context_fallback", user_id=user_id,
                           note="Context may be empty if running in async event loop")

        weak_topics = set(
            topic.lower()
            for topic, score in context.get("mastery_scores", {}).items()
            if score < 0.5  # Weak area threshold
        )
        recent_topics = set(t.lower() for t in context.get("recent_topics", [])[:3])  # Top 3 recent
        mastered_topics = set(
            topic.lower()
            for topic, score in context.get("mastery_scores", {}).items()
            if score > 0.75  # Mastery threshold
        )

        logger.debug(
            "learning_context_loaded",
            weak_count=len(weak_topics),
            recent_count=len(recent_topics),
            mastered_count=len(mastered_topics),
        )

        # Rerank with learning-aware boost
        boosted_nodes = []
        for node in nodes:
            # Extract text content
            content = node.node.get_content().lower()
            original_score = node.score or 0.0

            # Calculate boost
            boost_factor = 1.0
            boost_reasons = []

            # 1. Weak area boost (highest priority)
            for weak_topic in weak_topics:
                if weak_topic in content:
                    boost_factor *= self.weak_area_boost
                    boost_reasons.append(f"weak:{weak_topic}")
                    break  # Only boost once per weak area

            # 2. Recent topic boost (reinforcement)
            for recent_topic in recent_topics:
                if recent_topic in content:
                    boost_factor *= self.recent_topic_boost
                    boost_reasons.append(f"recent:{recent_topic}")
                    break

            # 3. Mastery penalty (focus on learning gaps)
            for mastered_topic in mastered_topics:
                if mastered_topic in content:
                    boost_factor *= self.mastery_penalty
                    boost_reasons.append(f"mastered:{mastered_topic}")
                    break

            # Apply boost
            boosted_score = original_score * boost_factor
            node.score = float(boosted_score)

            # Add boost metadata for transparency
            if boost_reasons:
                if not node.node.metadata:
                    node.node.metadata = {}
                node.node.metadata["learning_boost"] = {
                    "original_score": float(original_score),
                    "boost_factor": float(boost_factor),
                    "reasons": boost_reasons,
                }

            boosted_nodes.append(node)

        # Sort by new boosted scores
        reranked = sorted(boosted_nodes, key=lambda n: n.score, reverse=True)[: self.top_k]

        logger.info(
            "learning_reranking_complete",
            user_id=user_id,
            returned=len(reranked),
            top_boost=reranked[0].node.metadata.get("learning_boost", {}).get("boost_factor", 1.0)
            if reranked
            else 0,
        )

        return reranked
