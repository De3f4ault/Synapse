"""Hybrid retriever combining dense (Qdrant) + sparse (BM25) with RRF fusion."""

from typing import List, Optional
from llama_index.core.retrievers import BaseRetriever
from llama_index.core.schema import NodeWithScore, QueryBundle, TextNode
import structlog

from app.core.ai.rag.retrieval.retrievers.llamaindex_vector_retriever import QdrantVectorRetriever
from app.core.ai.rag.retrieval.retrievers.bm25_retriever import BM25Retriever
from app.core.ai.rag.retrieval.fusion.rrf import reciprocal_rank_fusion

logger = structlog.get_logger(__name__)


class HybridRetriever(BaseRetriever):
    """
    Hybrid retriever: Dense (Qdrant) + Sparse (BM25) + RRF fusion.
    
    Combines:
    - Dense retrieval: Semantic similarity (good for concepts)
    - Sparse retrieval: Keyword matching (good for specific terms)
    - RRF fusion: Score-agnostic result fusion
    
    Expected improvement: 15-25% better recall than dense-only.
    """
    
    def __init__(
        self,
        dense_retriever: QdrantVectorRetriever,
        bm25_retriever: BM25Retriever,
        dense_weight: float = 0.5,
        top_k: int = 50,
        use_weighted_fusion: bool = False,
        **kwargs
    ):
        """
        Initialize hybrid retriever.
        
        Args:
            dense_retriever: Qdrant vector retriever
            bm25_retriever: BM25 sparse retriever
            dense_weight: Weight for dense retriever (0.0-1.0)
                         sparse_weight = 1.0 - dense_weight
            top_k: Final number of results after fusion
            use_weighted_fusion: Use weighted RRF (vs standard RRF)
            **kwargs: Additional BaseRetriever arguments
        """
        super().__init__(**kwargs)
        
        self.dense = dense_retriever
        self.bm25 = bm25_retriever
        self.dense_weight = dense_weight
        self.sparse_weight = 1.0 - dense_weight
        self.top_k = top_k
        self.use_weighted = use_weighted_fusion
        
        logger.info(
            "hybrid_retriever_initialized",
            dense_weight=dense_weight,
            sparse_weight=self.sparse_weight,
            top_k=top_k,
            weighted=use_weighted_fusion
        )
    
    def _retrieve(self, query_bundle: QueryBundle) -> List[NodeWithScore]:
        """
        Hybrid retrieval with RRF fusion.
        
        Flow:
        1. Parallel retrieval: Dense (Qdrant) + Sparse (BM25)
        2. RRF fusion: Combine results
        3. Return top-k fused results
        
        Args:
            query_bundle: Query with metadata
        
        Returns:
            Fused and ranked nodes
        """
        query = query_bundle.query_str
        
        logger.info("hybrid_retrieval_start", query=query[:50])
        
        # 1. Dense retrieval (Qdrant)
        logger.debug("dense_retrieval_start")
        dense_nodes = self.dense.retrieve(query_bundle)
        logger.debug("dense_retrieval_complete", results=len(dense_nodes))
        
        # 2. Sparse retrieval (BM25)
        logger.debug("sparse_retrieval_start")
        bm25_results = self.bm25.search(query, top_k=self.top_k * 2)  # Retrieve 2x for better fusion
        logger.debug("sparse_retrieval_complete", results=len(bm25_results))
        
        # Convert BM25 results to compatible format for fusion
        dense_results_list = [
            {
                "id": node.node.id_,
                "text": node.node.get_content(),
                "score": node.score,
                "metadata": node.node.metadata,
                "retriever": "dense"
            }
            for node in dense_nodes
        ]
        
        # BM25 results already in dict format
        sparse_results_list = bm25_results
        
        # 3. Fuse with RRF
        if self.use_weighted:
            from app.core.ai.rag.retrieval.fusion.rrf import weighted_reciprocal_rank_fusion
            fused_results = weighted_reciprocal_rank_fusion(
                results_lists=[dense_results_list, sparse_results_list],
                weights=[self.dense_weight, self.sparse_weight],
                k=60,
                id_key="id"
            )
        else:
            fused_results = reciprocal_rank_fusion(
                results_lists=[dense_results_list, sparse_results_list],
                k=60,
                id_key="id"
            )
        
        # 4. Convert back to NodeWithScore
        fused_nodes = []
        for result in fused_results[:self.top_k]:
            # Create TextNode
            node = TextNode(
                text=result["text"],
                metadata=result.get("metadata", {}),
                id_=result.get("id", str(hash(result["text"][:100])))
            )
            
            # Use RRF score (or WR RF score)
            score = result.get("rrf_score") or result.get("wrrf_score", 0.0)
            
            fused_nodes.append(NodeWithScore(node=node, score=score))
        
        logger.info(
            "hybrid_retrieval_complete",
            dense_results=len(dense_nodes),
            sparse_results=len(bm25_results),
            fused_results=len(fused_nodes),
            top_fused_score=fused_nodes[0].score if fused_nodes else 0
        )
        
        return fused_nodes
