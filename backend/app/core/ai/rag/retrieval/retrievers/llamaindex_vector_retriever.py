"""LlamaIndex Qdrant vector retriever."""

from typing import List
from llama_index.core.retrievers import BaseRetriever
from llama_index.core.schema import NodeWithScore, QueryBundle, TextNode
import structlog

from app.core.ai.rag.vector_store.qdrant.client import QdrantClientWrapper
from app.core.ai.rag.vector_store.qdrant.collection_manager import CollectionManager
from app.core.ai.rag.vector_store.operations.search import VectorSearch
from app.core.ai.embeddings.boundary import get_embedder, get_llama_embedder

logger = structlog.get_logger(__name__)


class QdrantVectorRetriever(BaseRetriever):
    """
    Custom LlamaIndex retriever backed by Qdrant.

    Inherits from BaseRetriever to integrate seamlessly with
    LlamaIndex query engines and pipelines.

    Phase 0: Basic dense retrieval
    Phase 1+: Will add hybrid retrieval and reranking
    """

    def __init__(
        self,
        qdrant_client: QdrantClientWrapper,
        collection_manager: CollectionManager,
        top_k: int = 50,
        **kwargs,
    ):
        """
        Initialize Qdrant retriever.

        Args:
            qdrant_client: Qdrant client wrapper
            collection_manager: Collection manager
            top_k: Number of results to retrieve
            **kwargs: Additional BaseRetriever arguments
        """
        super().__init__(**kwargs)

        # Configure LlamaIndex to use boundary's shared embedding adapter
        from llama_index.core import Settings

        Settings.embed_model = get_llama_embedder()

        self.qdrant_client = qdrant_client.get_client()
        self.collection_manager = collection_manager
        self.searcher = VectorSearch(self.qdrant_client)
        self.top_k = top_k

    def _retrieve(self, query_bundle: QueryBundle) -> List[NodeWithScore]:
        """
        Synchronous retrieve implementation.
        Required by BaseRetriever abstract base class.

        Uses a thread-pool fallback when called from an async context
        (e.g., FastAPI handler) to avoid uvloop incompatibility with nest_asyncio.
        """
        import asyncio
        from concurrent.futures import ThreadPoolExecutor

        try:
            asyncio.get_running_loop()
            # Running inside an async context — offload to a worker thread
            with ThreadPoolExecutor(max_workers=1) as pool:
                return pool.submit(asyncio.run, self._aretrieve(query_bundle)).result()
        except RuntimeError:
            # No running loop — safe to use asyncio.run directly
            return asyncio.run(self._aretrieve(query_bundle))

    async def _aretrieve(self, query_bundle: QueryBundle) -> List[NodeWithScore]:
        """
        Retrieve nodes from Qdrant.

        LlamaIndex calls this method with a QueryBundle.

        Args:
            query_bundle: Contains query string and optional metadata

        Returns:
            List of NodeWithScore objects
        """
        query = query_bundle.query_str
        logger.info("qdrant_retrieval_start", query=query[:50])

        # 1. Get query embedding using boundary's singleton (no per-query model construction)
        embedder = get_embedder()
        embedding = embedder.encode(query)
        query_embedding = embedding[0].tolist() if embedding.ndim > 1 else embedding.tolist()

        # 2. Get user_id and source_type from metadata
        user_id = query_bundle.custom_embedding_strs.get("user_id")
        source_type = query_bundle.custom_embedding_strs.get("source_type", "documents")

        if not user_id:
            logger.error("user_id_missing_in_query_bundle")
            return []

        # 3. Get collection name
        collection_name = self.collection_manager._get_collection_name(int(user_id), source_type)

        # Check if collection exists
        if not self.collection_manager.collection_exists(collection_name):
            logger.warning("collection_not_found", collection=collection_name, user_id=user_id)
            return []

        # 4. Search Qdrant
        results = await self.searcher.search(
            collection_name=collection_name, query_vector=query_embedding, limit=self.top_k
        )

        # 5. Convert to LlamaIndex NodeWithScore format
        nodes_with_scores = []
        for result in results:
            node = TextNode(
                text=result.payload.get("text", ""),
                metadata={
                    "source_id": result.payload.get("source_id"),
                    "source_type": result.payload.get("source_type"),
                    "title": result.payload.get("title", "Untitled"),
                    "chunk_index": result.payload.get("chunk_index", 0),
                    "user_id": result.payload.get("user_id"),
                },
                id_=str(result.id),
            )

            nodes_with_scores.append(NodeWithScore(node=node, score=result.score))

        logger.info(
            "qdrant_retrieval_complete",
            results=len(nodes_with_scores),
            top_score=nodes_with_scores[0].score if nodes_with_scores else 0,
        )

        return nodes_with_scores
