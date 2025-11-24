"""Llama Index service context configuration."""

import logging
from typing import Optional

from llama_index.core import ServiceContext, Settings
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.llms.gemini import Gemini

from app.core.config import settings

logger = logging.getLogger(__name__)

# Global service context instance
_service_context: Optional[ServiceContext] = None


def get_service_context() -> ServiceContext:
    """
    Get or create Llama Index service context.

    Configures:
    - Embedding model: all-MiniLM-L6-v2 (384 dimensions)
    - LLM: Gemini Flash (for cost efficiency)
    - Chunk settings: 512 tokens with 50 token overlap

    Returns:
        ServiceContext: Configured Llama Index service context
    """
    global _service_context

    if _service_context is not None:
        return _service_context

    logger.info("Initializing Llama Index service context")

    try:
        # Configure embedding model
        logger.debug("Loading HuggingFace embedding model: all-MiniLM-L6-v2")
        embed_model = HuggingFaceEmbedding(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            embed_batch_size=32,
        )

        # Configure LLM (Gemini Flash for efficiency)
        logger.debug("Initializing Gemini Flash LLM")
        llm = Gemini(
            model="models/gemini-1.5-flash",
            api_key=settings.GEMINI_API_KEY,
            temperature=0.7,
        )

        # Create service context with settings
        Settings.embed_model = embed_model
        Settings.llm = llm
        Settings.chunk_size = 512
        Settings.chunk_overlap = 50

        _service_context = ServiceContext.from_defaults(
            embed_model=embed_model,
            llm=llm,
            chunk_size=512,
            chunk_overlap=50,
        )

        logger.info(" Llama Index service context initialized successfully")
        return _service_context

    except Exception as e:
        logger.error(f" Failed to initialize service context: {str(e)}")
        raise


def reset_service_context() -> None:
    """Reset the global service context (useful for testing)."""
    global _service_context
    _service_context = None
    logger.debug("Service context reset")
