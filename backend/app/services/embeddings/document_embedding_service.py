"""
Document embedding service with LanceDB integration.

Handles generating embeddings for document chunks and storing them
in LanceDB for semantic search and RAG queries.
"""

import logging
from typing import List, Dict, Any, Optional
import uuid

from app.services.embeddings.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)


class DocumentEmbeddingService:
    """
    Document-specific embedding service with vector store integration.

    Features:
    - Generate embeddings for document chunks
    - Store embeddings in LanceDB for semantic search
    - Update chunk records with embedding IDs
    - Support batch processing for efficiency

    Usage:
        service = DocumentEmbeddingService()
        await service.process_document_embeddings(
            document_id=123,
            chunks=chunk_list,
            session=db_session
        )
    """

    def __init__(
        self,
        embedding_service: Optional[EmbeddingService] = None,
        redis_client=None
    ):
        """
        Initialize document embedding service.

        Args:
            embedding_service: EmbeddingService instance (creates new if None)
            redis_client: Redis client for caching (optional)
        """
        self.embedding_service = embedding_service or EmbeddingService(
            redis_client=redis_client
        )

        logger.info("DocumentEmbeddingService initialized")

    async def process_document_embeddings(
        self,
        document_id: int,
        chunks: List[Any],
        session: Any
    ) -> Dict[str, Any]:
        """
        Generate and store embeddings for all document chunks.

        This method:
        1. Generates embeddings for all chunks
        2. Stores embeddings in LanceDB
        3. Updates chunk records with embedding IDs

        Args:
            document_id: Document ID
            chunks: List of DocumentChunk model instances
            session: SQLAlchemy async session

        Returns:
            Dict with processing statistics

        Raises:
            ValueError: If chunks list is empty
            Exception: If embedding generation or storage fails
        """
        if not chunks:
            raise ValueError("Cannot process embeddings for empty chunk list")

        logger.info(
            f"Processing embeddings for document {document_id}: "
            f"{len(chunks)} chunks"
        )

        try:
            # Extract chunk contents
            chunk_texts = [chunk.content for chunk in chunks]

            # Generate embeddings in batch
            embeddings = await self.embedding_service.generate_embeddings_batch(
                texts=chunk_texts,
                batch_size=32,
                skip_empty=True
            )

            # Store in LanceDB and update chunks
            stored_count = await self._store_embeddings_in_lancedb(
                document_id=document_id,
                chunks=chunks,
                embeddings=embeddings,
                session=session
            )

            stats = {
                "document_id": document_id,
                "total_chunks": len(chunks),
                "embeddings_generated": len([e for e in embeddings if e is not None]),
                "embeddings_stored": stored_count,
                "success": True
            }

            logger.info(
                f"Document {document_id} embeddings processed: "
                f"{stats['embeddings_stored']}/{stats['total_chunks']} stored"
            )

            return stats

        except Exception as e:
            logger.error(
                f"Failed to process embeddings for document {document_id}: {str(e)}",
                exc_info=True
            )
            raise

    async def _store_embeddings_in_lancedb(
        self,
        document_id: int,
        chunks: List[Any],
        embeddings: List[Optional[List[float]]],
        session: Any
    ) -> int:
        """
        Store embeddings in LanceDB and update chunk records.

        Args:
            document_id: Document ID
            chunks: List of DocumentChunk instances
            embeddings: List of embedding vectors
            session: Database session

        Returns:
            int: Number of embeddings successfully stored
        """
        try:
            from app.core.ai.rag.llama_index.storage_context import get_lancedb_client
            import lancedb

            # Get LanceDB client
            db = get_lancedb_client()

            # Create table name for this document
            table_name = f"document_{document_id}"

            # Prepare data for LanceDB
            vectors_data = []
            chunk_updates = []

            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                if embedding is None:
                    logger.warning(f"Skipping chunk {chunk.id} - no embedding generated")
                    continue

                # Generate unique embedding ID
                embedding_id = f"doc{document_id}_chunk{chunk.id}_{uuid.uuid4().hex[:8]}"

                # Prepare vector data
                vector_data = {
                    "id": embedding_id,
                    "vector": embedding,
                    "document_id": document_id,
                    "chunk_id": chunk.id,
                    "chunk_index": chunk.chunk_index,
                    "content": chunk.content,
                    "start_char": chunk.start_char,
                    "end_char": chunk.end_char,
                }

                vectors_data.append(vector_data)
                chunk_updates.append((chunk, embedding_id))

            if not vectors_data:
                logger.warning(f"No valid embeddings to store for document {document_id}")
                return 0

            # Create or open LanceDB table
            try:
                # Try to open existing table
                table = db.open_table(table_name)
                # Add new vectors
                table.add(vectors_data)
                logger.info(f"Added {len(vectors_data)} vectors to existing table: {table_name}")
            except Exception:
                # Table doesn't exist, create it
                table = db.create_table(table_name, data=vectors_data, mode="overwrite")
                logger.info(f"Created new table: {table_name} with {len(vectors_data)} vectors")

            # Update chunk records with embedding IDs
            for chunk, embedding_id in chunk_updates:
                chunk.embedding_id = embedding_id

            await session.flush()

            logger.info(
                f"Stored {len(vectors_data)} embeddings in LanceDB table: {table_name}"
            )

            return len(vectors_data)

        except Exception as e:
            logger.error(
                f"Failed to store embeddings in LanceDB for document {document_id}: {str(e)}",
                exc_info=True
            )
            raise

    async def query_document(
        self,
        document_id: int,
        query_text: str,
        top_k: int = 5,
        similarity_threshold: float = 0.5
    ) -> List[Dict[str, Any]]:
        """
        Query document chunks using semantic search.

        Args:
            document_id: Document ID to query
            query_text: Search query
            top_k: Number of top results to return
            similarity_threshold: Minimum similarity score (0.0 to 1.0)

        Returns:
            List of dicts with chunk info and similarity scores
        """
        try:
            from app.core.ai.rag.llama_index.storage_context import get_lancedb_client

            # Generate query embedding
            query_embedding = await self.embedding_service.generate_embedding(query_text)

            # Get LanceDB client
            db = get_lancedb_client()
            table_name = f"document_{document_id}"

            # Check if table exists
            if table_name not in db.table_names():
                logger.warning(f"No embeddings found for document {document_id}")
                return []

            # Open table and search
            table = db.open_table(table_name)
            results = table.search(query_embedding).limit(top_k).to_list()

            # Filter by similarity threshold and format results
            filtered_results = []
            for result in results:
                # LanceDB returns _distance (lower is better), convert to similarity
                distance = result.get("_distance", 1.0)
                similarity = 1.0 / (1.0 + distance)  # Convert distance to similarity

                if similarity >= similarity_threshold:
                    filtered_results.append({
                        "chunk_id": result["chunk_id"],
                        "chunk_index": result["chunk_index"],
                        "content": result["content"],
                        "similarity": similarity,
                        "start_char": result["start_char"],
                        "end_char": result["end_char"]
                    })

            logger.info(
                f"Query returned {len(filtered_results)} results for document {document_id} "
                f"(threshold: {similarity_threshold})"
            )

            return filtered_results

        except Exception as e:
            logger.error(
                f"Failed to query document {document_id}: {str(e)}",
                exc_info=True
            )
            return []

    async def delete_document_embeddings(self, document_id: int) -> bool:
        """
        Delete all embeddings for a document from LanceDB.

        Args:
            document_id: Document ID

        Returns:
            bool: True if successful
        """
        try:
            from app.core.ai.rag.llama_index.storage_context import get_lancedb_client

            db = get_lancedb_client()
            table_name = f"document_{document_id}"

            if table_name in db.table_names():
                db.drop_table(table_name)
                logger.info(f"Deleted embeddings for document {document_id}")
                return True
            else:
                logger.info(f"No embeddings found for document {document_id}")
                return True

        except Exception as e:
            logger.error(
                f"Failed to delete embeddings for document {document_id}: {str(e)}"
            )
            return False

    def get_embedding_dimension(self) -> int:
        """Get embedding dimension."""
        return self.embedding_service.get_dimension()
