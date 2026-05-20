"""Qdrant collection manager."""

from typing import Optional
import structlog
from qdrant_client import QdrantClient
from qdrant_client.http import models

from app.core.ai.rag.config.vector_store_config import VectorStoreConfig
from app.core.ai.rag.vector_store.qdrant.schema import get_collection_schema, get_search_params

logger = structlog.get_logger(__name__)

# The single unified collection for all document vectors:
#   "dense"   — 768D Nomic text embeddings (ANN + int8 quantization)
#   "bm25"    — sparse BM25 for lexical matching (server-side IDF)
#   "colbert" — 96D token matrices for MaxSim late-interaction reranking
#
# Previously synapse_colbert was a separate collection. It is now merged here.
# Multi-tenant isolation is via user_id payload filter (KEYWORD index).
SHARED_DENSE_COLLECTION = "synapse_dense"


class CollectionManager:
    """
    Manage Qdrant collections (create, delete, list).

    All collections use the v4 hybrid schema:
    - Named dense vector: cosine similarity (nomic-embed-text-v1.5, 768-dim)
    - Named sparse vector (bm25): server-side IDF via Modifier.IDF

    Collection naming:
    - Format: {prefix}_user_{user_id}_{source_type}
    - Example: synapse_v4_user_123_notes
    """
    
    def __init__(
        self,
        client: QdrantClient,
        config: Optional[VectorStoreConfig] = None
    ):
        """
        Initialize collection manager.
        
        Args:
            client: Qdrant client
            config: Vector store configuration
        """
        self.client = client
        
        if config is None:
            from app.core.ai.rag.config.vector_store_config import get_vector_store_config
            config = get_vector_store_config()
        
        self.config = config
    
    def create_user_collection(
        self,
        user_id: int,
        source_type: str = "documents"
    ) -> str:
        """
        Create user-specific collection (notes, flashcards, etc.).

        Per-user collections do NOT include the colbert multivector —
        they are dense+BM25 only. ColBERT reranking is for document search.

        Args:
            user_id: User ID
            source_type: Source type (documents, notes, code, etc.)

        Returns:
            Collection name
        """
        collection_name = self._get_collection_name(user_id, source_type)

        if self.collection_exists(collection_name):
            logger.info("collection_exists", name=collection_name)
            return collection_name

        # Per-user collections: dense + BM25 only (no colbert)
        schema = get_collection_schema(self.config, include_colbert=False)

        logger.info("creating_collection", name=collection_name)
        self.client.create_collection(
            collection_name=collection_name,
            **schema
        )

        if self.config.index_payload:
            self._create_payload_indices(collection_name)

        logger.info("collection_created", name=collection_name)
        return collection_name

    def create_shared_collection(self) -> str:
        """
        Create (or verify) the shared synapse_dense collection.

        This is the SINGLE collection for all document vectors:
        dense (768D Nomic) + bm25 (sparse) + colbert (96D multivec).

        Collection creation includes colbert from the start — no separate
        ensure_colbert_in_dense() or create_colbert_collection() call needed.
        Qdrant supports mixed regular + multivectors in one collection.

        Multi-tenant isolation is enforced via user_id payload filter
        (KEYWORD index) — not separate collections.

        Idempotent — safe to call on every task startup.

        Returns:
            Collection name (always SHARED_DENSE_COLLECTION)
        """
        if self.collection_exists(SHARED_DENSE_COLLECTION):
            return SHARED_DENSE_COLLECTION

        # Unified schema: dense + bm25 + colbert in one create_collection call
        schema = get_collection_schema(self.config, include_colbert=True)
        logger.info("creating_shared_collection", name=SHARED_DENSE_COLLECTION)

        self.client.create_collection(
            collection_name=SHARED_DENSE_COLLECTION,
            **schema
        )

        # Payload indices:
        # - user_id: KEYWORD — multi-tenant isolation (correctness requirement)
        # - content_type: KEYWORD — filter text vs image chunks
        # - chunk_strategy: KEYWORD — debug which chunker produced this chunk
        self._create_payload_indices(
            SHARED_DENSE_COLLECTION,
            extra_indices=[
                ("content_type", models.PayloadSchemaType.KEYWORD),
                ("chunk_strategy", models.PayloadSchemaType.KEYWORD),
            ],
        )

        logger.info("shared_collection_created", name=SHARED_DENSE_COLLECTION)
        return SHARED_DENSE_COLLECTION


    def collection_exists(self, collection_name: str) -> bool:
        """
        Check if collection exists.
        
        Args:
            collection_name: Collection name
        
        Returns:
            True if exists, False otherwise
        """
        try:
            self.client.get_collection(collection_name)
            return True
        except:
            return False
    
    def delete_collection(self, collection_name: str):
        """
        Delete collection.
        
        Args:
            collection_name: Collection name
        """
        if not self.collection_exists(collection_name):
            logger.warning("collection_not_found", name=collection_name)
            return
        
        logger.info("deleting_collection", name=collection_name)
        self.client.delete_collection(collection_name)
        logger.info("collection_deleted", name=collection_name)
    
    def list_user_collections(self, user_id: int) -> list[str]:
        """
        List all collections for a user.
        
        Args:
            user_id: User ID
        
        Returns:
            List of collection names
        """
        all_collections = self.client.get_collections().collections
        
        # Filter for user
        user_prefix = f"{self.config.collection_prefix}_user_{user_id}_"
        user_collections = [
            coll.name
            for coll in all_collections
            if coll.name.startswith(user_prefix)
        ]
        
        logger.debug(
            "list_user_collections",
            user_id=user_id,
            count=len(user_collections)
        )
        
        return user_collections
    
    def _get_collection_name(self, user_id: int, source_type: str) -> str:
        """
        Generate collection name.
        
        Args:
            user_id: User ID
            source_type: Source type
        
        Returns:
            Collection name
        """
        return f"{self.config.collection_prefix}_user_{user_id}_{source_type}"
    
    def _create_payload_indices(self, collection_name: str, extra_indices: list | None = None):
        """
        Create payload indices for efficient filtering.

        Indexes:
        - user_id (KEYWORD — multi-tenant isolation, correctness requirement)
        - source_id (for document identification)
        - source_type (for filtering by type)
        - extra_indices: additional (field_name, field_type) pairs

        Args:
            collection_name: Collection name
            extra_indices: Optional list of (field_name, PayloadSchemaType) tuples
        """
        indices = [
            ("user_id", models.PayloadSchemaType.KEYWORD),  # KEYWORD required for exact-match multi-tenant filtering
            ("source_id", models.PayloadSchemaType.KEYWORD),
            ("source_type", models.PayloadSchemaType.KEYWORD),
        ]
        if extra_indices:
            indices.extend(extra_indices)

        for field_name, field_type in indices:
            try:
                self.client.create_payload_index(
                    collection_name=collection_name,
                    field_name=field_name,
                    field_schema=field_type
                )
                logger.debug(
                    "payload_index_created",
                    collection=collection_name,
                    field=field_name
                )
            except Exception as e:
                logger.warning(
                    "payload_index_creation_failed",
                    collection=collection_name,
                    field=field_name,
                    error=str(e)
                )
