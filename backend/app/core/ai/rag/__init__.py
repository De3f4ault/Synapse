"""RAG Layer Package - Retrieval Augmented Generation with Llama Index."""

from app.core.ai.rag.synapse_bridge import SynapseBridge
from app.core.ai.rag.context_builder import build_rag_context

__all__ = [
    "SynapseBridge",
    "build_rag_context",
]
