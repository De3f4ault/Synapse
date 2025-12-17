"""SYNAPSE integration - updated with real ContextEngine."""

from app.core.ai.rag.synapse_integration.context_bridge import SynapseContextBridge, get_synapse_bridge
from app.core.ai.rag.synapse_integration.learning_aware_reranker import LearningAwareReranker
from app.core.ai.rag.synapse_integration.real_context_engine import RealContextEngineIntegration, get_context_integration

__all__ = [
    "SynapseContextBridge",
    "get_synapse_bridge",
    "LearningAwareReranker",
    "RealContextEngineIntegration",
    "get_context_integration",
]
