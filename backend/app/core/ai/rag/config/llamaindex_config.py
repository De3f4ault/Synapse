"""LlamaIndex global settings configuration."""

import structlog
from typing import Optional
from llama_index.core import Settings
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from app.core.ai.rag.config.model_config import get_model_config

logger = structlog.get_logger(__name__)

# Flag to track if settings have been configured
_configured = False


def configure_llamaindex(model_config: Optional[any] = None):
    """
    Configure LlamaIndex global settings.

    Sets up:
    - Embedding model (all-MiniLM-L6-v2)
    - Chunk settings
    - Retrieval parameters

    Args:
        model_config: Model configuration (uses default if None)
    """
    global _configured

    if _configured:
        logger.debug("llamaindex_already_configured")
        return

    if model_config is None:
        model_config = get_model_config()

    # Configure embedding model
    Settings.embed_model = HuggingFaceEmbedding(
        model_name=model_config.embedding_model_name,
        cache_folder=model_config.model_cache_dir,
        device=model_config.embedding_device,
        max_length=512,
        normalize=model_config.embedding_normalize,
    )

    # Chunk settings (used by default node parsers)
    Settings.chunk_size = 512
    Settings.chunk_overlap = 128

    # Number of results to retrieve (can override per query)
    Settings.num_output = 5

    # LLM will be set separately by existing LiteLLM integration
    # Settings.llm = ... (handled by orchestrator)

    _configured = True
    logger.info(
        "llamaindex_configured",
        embedding_model=model_config.embedding_model_name,
        chunk_size=Settings.chunk_size,
        chunk_overlap=Settings.chunk_overlap,
    )


def is_configured() -> bool:
    """Check if LlamaIndex settings have been configured"""
    return _configured


def reset_settings():
    """Reset LlamaIndex settings (for testing)"""
    global _configured
    _configured = False
    logger.info("llamaindex_settings_reset")
