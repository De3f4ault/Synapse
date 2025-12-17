"""LlamaIndex cross-encoder reranker integration."""

from typing import List, Optional, Any
from llama_index.core.postprocessor.types import BaseNodePostprocessor
from llama_index.core.schema import NodeWithScore, QueryBundle
from pydantic import PrivateAttr, Field
import structlog

from app.core.ai.rag.reranking.models.cross_encoder import CrossEncoderReranker
from app.core.ai.rag.config.model_config import ModelConfig

logger = structlog.get_logger(__name__)


class CrossEncoderNodeReranker(BaseNodePostprocessor):
    """
    LlamaIndex-compatible cross-encoder reranker.
    
    Integrates with LlamaIndex QueryPipeline as a NodePostprocessor.
    
    Usage:
        reranker = CrossEncoderNodeReranker(top_k=5)
        pipeline.add_modules({"reranker": reranker})
        pipeline.add_link("retriever", "reranker")
    """
    top_k: int = Field(default=5, description="Number of top results to return")
    _reranker: Any = PrivateAttr()
    
    def __init__(
        self,
        top_k: int = 5,
        config: Optional[ModelConfig] = None,
        **kwargs
    ):
        """
        Initialize cross-encoder node reranker.
        
        Args:
            top_k: Number of top results to return
            config: Model configuration
            **kwargs: Additional BaseNodePostprocessor arguments
        """
        super().__init__(top_k=top_k, **kwargs)
        
        # Initialize cross-encoder
        from app.core.ai.rag.reranking.models.cross_encoder import get_cross_encoder_reranker
        self._reranker = get_cross_encoder_reranker(config=config)
        
        logger.info("cross_encoder_node_reranker_initialized", top_k=top_k)
    
    def _postprocess_nodes(
        self,
        nodes: List[NodeWithScore],
        query_bundle: Optional[QueryBundle] = None
    ) -> List[NodeWithScore]:
        """
        Rerank nodes using cross-encoder.
        
        LlamaIndex calls this method after retrieval.
        
        Args:
            nodes: Retrieved nodes from retriever
            query_bundle: Original query
        
        Returns:
            Reranked nodes (top_k)
        """
        if not query_bundle or not nodes:
            logger.warning("no_query_or_nodes_for_reranking")
            return nodes
        
        query = query_bundle.query_str
        
        logger.info(
            "reranking_nodes",
            query=query[:50],
            candidates=len(nodes),
            top_k=self.top_k
        )
        
        # Extract document texts
        documents = [node.node.get_content() for node in nodes]
        
        # Rerank using cross-encoder
        ranked_indices_scores = self._reranker.rerank(
            query=query,
            documents=documents,
            top_k=self.top_k
        )
        
        # Rebuild node list with new scores
        reranked_nodes = []
        for idx, score in ranked_indices_scores:
            node = nodes[idx]
            # Update score with cross-encoder score
            node.score = float(score)
            reranked_nodes.append(node)
        
        logger.info(
            "reranking_complete",
            original_top_score=nodes[0].score if nodes else 0,
            reranked_top_score=reranked_nodes[0].score if reranked_nodes else 0,
            returned=len(reranked_nodes)
        )
        
        return reranked_nodes
