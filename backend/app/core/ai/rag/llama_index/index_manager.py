"""Index manager for creating and managing Llama Index indices."""

import logging
from datetime import datetime
from typing import List, Optional

from llama_index.core import VectorStoreIndex, Document
from llama_index.core.schema import BaseNode

from app.core.ai.rag.llama_index.service_context import get_service_context
from app.core.ai.rag.llama_index.storage_context import get_storage_context

logger = logging.getLogger(__name__)


class IndexManager:
    """
    Manages creation, loading, and maintenance of Llama Index indices.

    Each user gets their own index for personalized search:
    - Index ID: f"user_{user_id}"
    - Contains: All user's documents, notes, flashcards
    - Isolation: Separate indices prevent data leakage
    """

    def __init__(self):
        """Initialize index manager."""
        self.service_context = get_service_context()
        self.storage_context = get_storage_context()
        logger.debug("IndexManager initialized")

    async def create_index(
        self,
        user_id: int,
        documents: List[Document],
        overwrite: bool = False,
    ) -> VectorStoreIndex:
        """
        Create a new vector index for a user.

        Args:
            user_id: User ID
            documents: List of Llama Index Document objects
            overwrite: Whether to overwrite existing index

        Returns:
            VectorStoreIndex: Created index
        """
        index_id = f"user_{user_id}"
        logger.info(f"Creating index {index_id} with {len(documents)} documents")

        try:
            # Create index from documents
            index = VectorStoreIndex.from_documents(
                documents,
                service_context=self.service_context,
                storage_context=self.storage_context,
                show_progress=True,
            )

            logger.info(f"✅ Index {index_id} created successfully")
            return index

        except Exception as e:
            logger.error(f"❌ Failed to create index {index_id}: {str(e)}")
            raise

    async def load_index(self, user_id: int) -> Optional[VectorStoreIndex]:
        """
        Load existing index for a user.

        Args:
            user_id: User ID

        Returns:
            VectorStoreIndex: Loaded index, or None if not found
        """
        index_id = f"user_{user_id}"
        logger.debug(f"Loading index {index_id}")

        try:
            index = VectorStoreIndex.from_vector_store(
                vector_store=self.storage_context.vector_store,
                service_context=self.service_context,
            )

            logger.debug(f"✅ Index {index_id} loaded successfully")
            return index

        except Exception as e:
            logger.warning(f"Index {index_id} not found or loading failed: {str(e)}")
            return None

    async def update_index(
        self,
        user_id: int,
        documents: List[Document],
    ) -> VectorStoreIndex:
        """
        Update existing index with new documents.

        Args:
            user_id: User ID
            documents: New documents to add

        Returns:
            VectorStoreIndex: Updated index
        """
        index_id = f"user_{user_id}"
        logger.info(f"Updating index {index_id} with {len(documents)} documents")

        try:
            # Load existing index
            index = await self.load_index(user_id)

            if index is None:
                # Create new if doesn't exist
                logger.info(f"Index {index_id} doesn't exist, creating new")
                return await self.create_index(user_id, documents)

            # Add documents to index
            for doc in documents:
                index.insert(doc)

            logger.info(f"✅ Index {index_id} updated successfully")
            return index

        except Exception as e:
            logger.error(f"❌ Failed to update index {index_id}: {str(e)}")
            raise

    async def delete_index(self, user_id: int) -> bool:
        """
        Delete a user's index.

        Args:
            user_id: User ID

        Returns:
            bool: Whether deletion was successful
        """
        index_id = f"user_{user_id}"
        logger.info(f"Deleting index {index_id}")

        try:
            # LanceDB: Delete table if exists
            table_name = f"user_{user_id}"
            if table_name in self.storage_context.vector_store.db.table_names():
                self.storage_context.vector_store.db.drop_table(table_name)

            logger.info(f"✅ Index {index_id} deleted successfully")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to delete index {index_id}: {str(e)}")
            return False

    async def list_indices(self) -> List[str]:
        """
        List all indices in vector store.

        Returns:
            List[str]: List of index/table names
        """
        try:
            tables = self.storage_context.vector_store.db.table_names()
            user_indices = [t for t in tables if t.startswith("user_")]
            logger.debug(f"Found {len(user_indices)} user indices")
            return user_indices

        except Exception as e:
            logger.error(f"❌ Failed to list indices: {str(e)}")
            return []

    def get_index_id_for_user(self, user_id: int) -> str:
        """
        Get the index ID for a user.

        Args:
            user_id: User ID

        Returns:
            str: Index ID (pattern: user_{user_id})
        """
        return f"user_{user_id}"
