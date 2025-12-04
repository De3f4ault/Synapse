"""⭐ SYNAPSE Bridge - Makes Llama Index learning-aware - ENHANCED."""

import logging
from typing import Dict, List, Optional

from app.core.ai.rag.llama_index import QueryEngine
from app.core.ai.rag.reranking.synapse_reranker import SynapseReranker
from app.core.context.engine import ContextEngine
from app.core.ai.rag.llama_index.storage_context import get_lancedb_client
from app.core.ai.rag.embeddings.manager import EmbeddingManager

logger = logging.getLogger(__name__)


class SynapseBridge:
    """
    Bridge between SYNAPSE learning context and Llama Index RAG.

    ⭐ ENHANCED with direct semantic search capability

    Flow:
    1. Get user's SYNAPSE context (weak areas, progress, learning style)
    2. Enhance query based on weak areas
    3. Query Llama Index (vector search) OR direct semantic search
    4. Rerank results considering user context
    5. Return personalized ranked results
    """

    def __init__(self):
        """Initialize SYNAPSE bridge with enhanced capabilities."""
        try:
            self.query_engine = QueryEngine()
        except Exception as e:
            logger.warning(f"QueryEngine init failed, using fallback: {e}")
            self.query_engine = None

        self.reranker = SynapseReranker()
        self.context_engine = ContextEngine()
        self.embedding_manager = EmbeddingManager()
        logger.info("✅ SynapseBridge initialized (enhanced)")

    async def query_with_synapse_context(
        self,
        user_id: int,
        query: str,
        focus: Optional[str] = None,
        top_k: int = 10,
    ) -> Dict:
        """
        Query with full SYNAPSE personalization.

        Args:
            user_id: User ID
            query: Search query
            focus: Optional learning focus
            top_k: Number of results to retrieve

        Returns:
            Dict containing results and metadata
        """
        logger.info(f"📚 SYNAPSE query for user {user_id}: '{query}'")

        try:
            # Step 1: Get SYNAPSE context
            logger.debug("Step 1: Fetching user context...")
            user_context = await self.context_engine.get_user_context(
                user_id, focus
            )

            weak_areas = user_context.get("analytics", {}).get("weak_topics", [])
            logger.debug(f"Weak areas: {weak_areas}")

            # Step 2: Enhance query
            logger.debug("Step 2: Enhancing query...")
            enhanced_query = self._enhance_query(query, weak_areas)
            logger.debug(f"Enhanced query: {enhanced_query}")

            # Step 3: Try vector search
            logger.debug("Step 3: Vector search via LanceDB...")
            results = await self.semantic_search(
                query=query,
                user_id=user_id,
                limit=top_k,
            )

            if not results:
                logger.warning(f"No results found for user {user_id}")
                return {
                    "query": query,
                    "user_context": user_context,
                    "retrieved_chunks": [],
                    "weak_areas_coverage": {},
                    "sources": [],
                }

            logger.debug(f"Retrieved {len(results)} results from vector store")

            # Step 4: Rerank with SYNAPSE priorities
            logger.debug("Step 4: Reranking results...")
            reranked = await self.reranker.rerank(
                query=query,
                results=results,
                user_context=user_context,
                weak_areas=weak_areas,
            )

            # Step 5: Calculate coverage and extract sources
            logger.debug("Step 5: Analyzing results...")
            coverage = self.reranker.calculate_weak_area_coverage(
                reranked, weak_areas
            )
            sources = self._extract_sources(reranked)

            logger.info(f"✅ SYNAPSE query complete: {len(reranked)} results")

            return {
                "query": query,
                "user_context": user_context,
                "retrieved_chunks": reranked,
                "weak_areas_coverage": coverage,
                "sources": sources,
            }

        except Exception as e:
            logger.error(f"❌ SYNAPSE query failed: {str(e)}", exc_info=True)
            return {
                "query": query,
                "user_context": {},
                "retrieved_chunks": [],
                "weak_areas_coverage": {},
                "sources": [],
                "error": str(e),
            }

    async def semantic_search(
        self,
        query: str,
        user_id: int,
        limit: int = 20
    ) -> List[Dict]:
        """
        Direct semantic search using vector embeddings.

        Steps:
        1. Generate query embedding
        2. Search LanceDB for similar vectors
        3. Return results with similarity scores

        Args:
            query: Search query
            user_id: User ID (for user-specific index)
            limit: Maximum results

        Returns:
            List of search results with similarity scores
        """
        logger.debug(
            f"Semantic search: '{query}' for user {user_id}"
        )

        try:
            # Generate query embedding
            query_embedding = await self.embedding_manager.generate_embedding(query)
            logger.debug(f"Generated query embedding: {len(query_embedding)}D")

            # Get LanceDB client
            db = get_lancedb_client()

            # Search all user tables
            all_results = []

            table_names = db.table_names()
            logger.debug(f"Searching {len(table_names)} tables")

            for table_name in table_names:
                # Filter for user-specific tables
                if not table_name.startswith(f"user_{user_id}"):
                    continue

                try:
                    table = db.open_table(table_name)

                    # Perform vector search
                    results = table.search(query_embedding).limit(limit).to_list()

                    # Format results
                    for result in results:
                        all_results.append({
                            "content": result.get("text", ""),
                            "score": 1.0 / (1.0 + result.get("_distance", 1.0)),  # Convert distance to similarity
                            "metadata": {
                                "source_id": result.get("source_id"),
                                "source_type": result.get("source_type", "document"),
                                "title": result.get("title", "Untitled"),
                                "chunk_index": result.get("chunk_index", 0),
                                "table": table_name,
                            }
                        })

                    logger.debug(f"Table {table_name}: {len(results)} results")

                except Exception as e:
                    logger.warning(f"Error searching table {table_name}: {e}")
                    continue

            # Sort by similarity score (descending)
            all_results.sort(key=lambda x: x["score"], reverse=True)

            # Limit total results
            final_results = all_results[:limit]

            logger.info(
                f"Semantic search complete: {len(final_results)} results from "
                f"{len([t for t in table_names if t.startswith(f'user_{user_id}')])} tables"
            )

            return final_results

        except Exception as e:
            logger.error(f"Semantic search error: {e}", exc_info=True)
            return []

    def _enhance_query(self, query: str, weak_areas: List[str]) -> str:
        """
        Enhance query by boosting weak areas.

        Args:
            query: Original query
            weak_areas: Topics where user struggles

        Returns:
            str: Enhanced query
        """
        if not weak_areas:
            return query

        # Add weak areas as context
        weak_keywords = ", ".join(weak_areas[:3])
        enhanced = f"{query}\n\n[FOCUS]: {weak_keywords}"

        return enhanced

    def _extract_sources(self, results: List[Dict]) -> List[Dict]:
        """
        Extract unique sources from results.

        Args:
            results: Retrieved results

        Returns:
            List[Dict]: Unique sources with metadata
        """
        sources_map = {}

        for result in results:
            metadata = result.get("metadata", {})
            source_id = metadata.get("source_id")
            source_type = metadata.get("source_type", "unknown")

            if not source_id:
                continue

            key = (source_type, source_id)
            if key not in sources_map:
                sources_map[key] = {
                    "type": source_type,
                    "id": source_id,
                    "title": metadata.get("title", "Untitled"),
                    "url": metadata.get("url"),
                    "relevance_count": 0,
                }

            sources_map[key]["relevance_count"] += 1

        sources = list(sources_map.values())
        sources.sort(key=lambda x: x["relevance_count"], reverse=True)

        return sources

    async def batch_query(
        self,
        user_id: int,
        queries: List[str],
    ) -> List[Dict]:
        """
        Batch query for multiple queries.

        Args:
            user_id: User ID
            queries: List of queries

        Returns:
            List[Dict]: Results for each query
        """
        logger.info(f"Batch querying {len(queries)} queries for user {user_id}")

        results = []
        for query in queries:
            result = await self.query_with_synapse_context(user_id, query)
            results.append(result)

        return results
