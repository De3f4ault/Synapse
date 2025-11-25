"""Query engine for RAG retrieval operations."""

import logging
from typing import Dict, List, Optional

from llama_index.core import VectorStoreIndex
from llama_index.core.schema import NodeWithScore

from app.core.ai.rag.llama_index.index_manager import IndexManager
from app.core.ai.rag.llama_index.service_context import get_service_context

logger = logging.getLogger(__name__)


class QueryEngine:
    """
    Query interface for retrieving relevant documents via RAG.

    Handles:
    - Vector search in LanceDB
    - Score normalization
    - Metadata extraction
    - Result formatting
    """

    def __init__(self):
        """Initialize query engine."""
        self.index_manager = IndexManager()
        self.service_context = get_service_context()
        logger.debug("QueryEngine initialized")

    async def query(
        self,
        user_id: int,
        query: str,
        top_k: int = 5,
        filters: Optional[Dict] = None,
    ) -> List[Dict]:
        """
        Retrieve relevant documents for a query.

        Args:
            user_id: User ID
            query: Search query
            top_k: Number of results to return
            filters: Optional metadata filters

        Returns:
            List[Dict]: Ranked results with scores

        Example:
            results = await query_engine.query(
                user_id=1,
                query="What is photosynthesis?",
                top_k=5
            )
            # Returns: [
            #   {
            #     "text": "Photosynthesis is...",
            #     "score": 0.85,
            #     "metadata": {"source": "note_id", "page": 1}
            #   },
            #   ...
            # ]
        """
        logger.info(f"Querying for user {user_id}: '{query}'")

        try:
            # Load user's index
            index = await self.index_manager.load_index(user_id)
            if index is None:
                logger.warning(f"No index found for user {user_id}")
                return []

            # Create query engine from index
            query_engine = index.as_query_engine(
                similarity_top_k=top_k,
                streaming=False,
            )

            # Execute query
            logger.debug(f"Executing query with top_k={top_k}")
            response = query_engine.query(query)

            # Format results
            results = self._format_results(response, top_k)

            logger.info(f"✅ Retrieved {len(results)} results for user {user_id}")
            return results

        except Exception as e:
            logger.error(f"❌ Query failed for user {user_id}: {str(e)}")
            return []

    async def query_with_context(
        self,
        user_id: int,
        query: str,
        context: Optional[str] = None,
        top_k: int = 5,
    ) -> List[Dict]:
        """
        Query with additional context for better retrieval.

        Args:
            user_id: User ID
            query: Search query
            context: Additional context to enhance search
            top_k: Number of results

        Returns:
            List[Dict]: Ranked results
        """
        # Enhance query with context
        if context:
            enhanced_query = f"{query}\n\nContext: {context}"
            logger.debug(f"Enhanced query with context")
        else:
            enhanced_query = query

        return await self.query(user_id, enhanced_query, top_k)

    def _format_results(
        self,
        response: NodeWithScore,
        top_k: int,
    ) -> List[Dict]:
        """
        Format query response into structured results.

        Args:
            response: LLama Index response object
            top_k: Expected number of results

        Returns:
            List[Dict]: Formatted results
        """
        results = []

        # Extract source nodes from response
        source_nodes = response.source_nodes if hasattr(response, 'source_nodes') else []

        for i, node in enumerate(source_nodes[:top_k]):
            try:
                result = {
                    "text": node.get_content(),
                    "score": float(node.score) if hasattr(node, 'score') else 1.0 - (i * 0.1),
                    "metadata": {
                        "node_id": str(node.node_id),
                        **(node.metadata or {})
                    }
                }
                results.append(result)

            except Exception as e:
                logger.warning(f"Failed to format result {i}: {str(e)}")
                continue

        return results

    async def retrieve_nodes(
        self,
        user_id: int,
        query: str,
        top_k: int = 10,
    ) -> List[NodeWithScore]:
        """
        Retrieve raw nodes for advanced processing.

        Args:
            user_id: User ID
            query: Search query
            top_k: Number of results

        Returns:
            List[NodeWithScore]: Raw Llama Index nodes
        """
        logger.debug(f"Retrieving raw nodes for user {user_id}")

        try:
            index = await self.index_manager.load_index(user_id)
            if index is None:
                return []

            retriever = index.as_retriever(similarity_top_k=top_k)
            nodes = retriever.retrieve(query)

            logger.debug(f"Retrieved {len(nodes)} raw nodes")
            return nodes

        except Exception as e:
            logger.error(f"Failed to retrieve raw nodes: {str(e)}")
            return []
