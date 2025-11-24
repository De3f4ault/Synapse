"""LanceDB storage context configuration for Llama Index."""

import logging
from pathlib import Path
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

# Global storage context instance
_storage_context = None
_lancedb_client = None


def get_lancedb_client():
    """
    Get or create LanceDB client.

    LanceDB is a vector database optimized for:
    - Fast ANN (Approximate Nearest Neighbor) search
    - GPU acceleration (if available)
    - Multi-modal data support

    Returns:
        lancedb.DBConnection: Connected LanceDB client
    """
    global _lancedb_client

    if _lancedb_client is not None:
        return _lancedb_client

    try:
        import lancedb

        # Ensure data directory exists
        data_path = Path(settings.LANCEDB_PATH)
        data_path.parent.mkdir(parents=True, exist_ok=True)

        logger.info(f"Connecting to LanceDB at: {settings.LANCEDB_PATH}")
        _lancedb_client = lancedb.connect(str(data_path))

        logger.info("LanceDB client initialized successfully")
        return _lancedb_client

    except ImportError:
        logger.warning("LanceDB package not installed. Install with: pip install lancedb")
        raise
    except Exception as e:
        logger.error(f"Failed to connect to LanceDB: {str(e)}")
        raise


def get_storage_context():
    """
    Get or create Llama Index storage context.

    Uses LanceDB as vector store for:
    - Efficient vector storage and retrieval
    - Metadata management
    - Multi-index support (one per user)

    Returns:
        StorageContext: Configured storage context with LanceDB
    """
    global _storage_context

    if _storage_context is not None:
        return _storage_context

    logger.info("Initializing storage context with LanceDB")

    try:
        from llama_index.core import StorageContext

        # Try the new package name first, fall back to old
        try:
            from llama_index.vector_stores.lancedb import LanceDBVectorStore
        except ImportError:
            try:
                from llama_index_vector_stores_lancedb import LanceDBVectorStore
            except ImportError:
                logger.warning(
                    "LanceDB vector store not available. "
                    "Install with: pip install llama-index-vector-stores-lancedb"
                )
                raise ImportError("llama-index-vector-stores-lancedb not installed")

        # Get LanceDB client
        db_client = get_lancedb_client()

        # Create LanceDB vector store
        logger.debug("Creating LanceDB vector store")
        vector_store = LanceDBVectorStore(
            db=db_client,
            mode="overwrite",
        )

        # Create storage context
        _storage_context = StorageContext.from_defaults(
            vector_store=vector_store,
        )

        logger.info("Storage context initialized successfully")
        return _storage_context

    except Exception as e:
        logger.error(f"Failed to initialize storage context: {str(e)}")
        raise


async def init_lancedb() -> None:
    """
    Initialize LanceDB at application startup.

    Verifies:
    - Connection to LanceDB
    - Directory structure
    - Required tables exist (or can be created)
    """
    logger.info("Initializing LanceDB...")

    try:
        # Get client (creates connection)
        client = get_lancedb_client()

        # Get storage context (creates vector store)
        storage_ctx = get_storage_context()

        # Test connection
        logger.debug("Testing LanceDB connection...")
        tables = client.table_names()
        logger.info(f"LanceDB initialized. Existing tables: {tables}")

    except Exception as e:
        logger.error(f"LanceDB initialization failed: {str(e)}")
        raise


def reset_storage_context() -> None:
    """Reset the global storage context (useful for testing)."""
    global _storage_context, _lancedb_client
    _storage_context = None
    _lancedb_client = None
    logger.debug("Storage context reset")
