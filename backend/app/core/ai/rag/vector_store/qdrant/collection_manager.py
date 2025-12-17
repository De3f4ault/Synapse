"""Qdrant collection manager."""

from typing import Optional
import structlog
from qdrant_client import QdrantClient
from qdrant_client.http import models

from app.core.ai.rag.config.vector_store_config import VectorStoreConfig
from app.core.ai.rag.vector_store.qdrant.schema import get_collection_schema

logger = structlog.get_logger(__name__)


class CollectionManager:
    """
    Manage Qdrant collections (create, delete, list).
    
    Collection naming:
    - Format: {prefix}_user_{user_id}_{source_type}
    - Example: synapse_v2_user_123_documents
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
        Create user-specific collection.
        
        Args:
            user_id: User ID
            source_type: Source type (documents, notes, code, etc.)
        
        Returns:
            Collection name
        """
        collection_name = self._get_collection_name(user_id, source_type)
        
        # Check if exists
        if self.collection_exists(collection_name):
            logger.info("collection_exists", name=collection_name)
            return collection_name
        
        # Get schema
        schema = get_collection_schema(self.config)
        
        # Create collection
        logger.info("creating_collection", name=collection_name)
        
        self.client.create_collection(
            collection_name=collection_name,
            **schema
        )
        
        # Create payload index for filtering
        if self.config.index_payload:
            self._create_payload_indices(collection_name)
        
        logger.info("collection_created", name=collection_name)
        return collection_name
    
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
    
    def _create_payload_indices(self, collection_name: str):
        """
        Create payload indices for efficient filtering.
        
        Indexes:
        - user_id (for multitenancy)
        - source_id (for document identification)
        - source_type (for filtering by type)
        
        Args:
            collection_name: Collection name
        """
        indices = [
            ("user_id", models.PayloadSchemaType.INTEGER),
            ("source_id", models.PayloadSchemaType.KEYWORD),
            ("source_type", models.PayloadSchemaType.KEYWORD),
        ]
        
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
