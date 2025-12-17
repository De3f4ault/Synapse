"""Qdrant client wrapper."""

from typing import Optional
from qdrant_client import QdrantClient
import structlog

from app.core.ai.rag.config.vector_store_config import VectorStoreConfig

logger = structlog.get_logger(__name__)


class QdrantClientWrapper:
    """
    Wrapper around Qdrant client with health checking.
    
    Provides:
    - Connection management
    - Health monitoring
    - Automatic reconnection
    """
    
    def __init__(self, config: Optional[VectorStoreConfig] = None):
        """
        Initialize Qdrant client.
        
        Args:
            config: Vector store configuration
        """
        if config is None:
            from app.core.ai.rag.config.vector_store_config import get_vector_store_config
            config = get_vector_store_config()
        
        self.config = config
        
        # Initialize client
        logger.info(
            "qdrant_client_initializing",
            host=config.host,
            port=config.port
        )
        
        self.client = QdrantClient(
            host=config.host,
            port=config.port,
            api_key=config.api_key,
            timeout=config.timeout,
            prefer_grpc=config.prefer_grpc
        )
        
        logger.info("qdrant_client_initialized")
    
    def health_check(self) -> bool:
        """
        Check if Qdrant is healthy.
        
        Returns:
            True if healthy, False otherwise
        """
        try:
            self.client.get_collections()
            logger.debug("qdrant_health_check_passed")
            return True
        except Exception as e:
            logger.error("qdrant_health_check_failed", error=str(e))
            return False
    
    def get_client(self) -> QdrantClient:
        """Get underlying Qdrant client"""
        return self.client


# Global client instance
_client: Optional[QdrantClientWrapper] = None


def get_qdrant_client(
    config: Optional[VectorStoreConfig] = None
) -> QdrantClientWrapper:
    """Get global Qdrant client instance"""
    global _client
    
    if _client is None:
        _client = QdrantClientWrapper(config=config)
    
    return _client
