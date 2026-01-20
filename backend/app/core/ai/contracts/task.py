"""
AITask — Canonical intent classification for all AI calls.

These represent the *reason* for an AI request.
Routing is based on task, never on prompt content.
"""

from enum import Enum


class AITask(Enum):
    """
    Canonical intent classification for all AI calls.
    These MUST remain stable over time.
    """

    # Reasoning & cognition (THEORIST)
    ABSTRACT_REASONING = "abstract_reasoning"
    LOGICAL_VERIFICATION = "logical_verification"
    MATHEMATICAL_SOLVING = "mathematical_solving"

    # Software & engineering (BUILDER)
    CODE_GENERATION = "code_generation"
    CODE_REFACTORING = "code_refactoring"
    ARCHITECTURE_DESIGN = "architecture_design"

    # Knowledge & language (TUTOR)
    EXPLANATION = "explanation"
    SUMMARIZATION = "summarization"
    LONG_CONTEXT_SYNTHESIS = "long_context_synthesis"
    GENERAL_ASSISTANCE = "general_assistance"  # Default for agents

    # Retrieval & RAG (ANALYZER)
    CONTEXTUAL_QA = "contextual_qa"
    SEMANTIC_REWRITE = "semantic_rewrite"

    # Planning (PLANNER)
    TASK_DECOMPOSITION = "task_decomposition"
    WORKFLOW_ORCHESTRATION = "workflow_orchestration"

    # Multimodal
    IMAGE_REASONING = "image_reasoning"
    DOCUMENT_UNDERSTANDING = "document_understanding"
