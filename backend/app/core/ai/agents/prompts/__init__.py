"""
Agent Prompt Templates

Reusable prompt components for all agents.
Centralized prompt management for consistency and maintainability.
"""

from app.core.ai.agents.prompts.tutor_prompts import (
    TUTOR_BASE_PROMPT,
    SOCRATIC_QUESTION_PATTERNS,
    LEVEL_BASED_STRATEGIES,
    RESPONSE_TEMPLATES,
    get_tutor_prompt_with_context,
    get_socratic_question,
    get_response_template,
    build_explanation_prompt,
    PROMPT_FRAGMENTS as TUTOR_PROMPT_FRAGMENTS,
)

from app.core.ai.agents.prompts.document_prompts import (
    DOCUMENT_ANALYSIS_PROMPT,
    DOCUMENT_TYPE_PROMPTS,
    ANALYSIS_DEPTH_LEVELS,
    QA_STRATEGIES,
    get_document_prompt_with_context,
    get_multimodal_analysis_prompt,
    get_study_material_generation_prompt,
    get_section_analysis_prompt,
    PROMPT_FRAGMENTS as DOCUMENT_PROMPT_FRAGMENTS,
)

__all__ = [
    # Tutor prompts
    "TUTOR_BASE_PROMPT",
    "SOCRATIC_QUESTION_PATTERNS",
    "LEVEL_BASED_STRATEGIES",
    "RESPONSE_TEMPLATES",
    "get_tutor_prompt_with_context",
    "get_socratic_question",
    "get_response_template",
    "build_explanation_prompt",
    "TUTOR_PROMPT_FRAGMENTS",

    # Document prompts
    "DOCUMENT_ANALYSIS_PROMPT",
    "DOCUMENT_TYPE_PROMPTS",
    "ANALYSIS_DEPTH_LEVELS",
    "QA_STRATEGIES",
    "get_document_prompt_with_context",
    "get_multimodal_analysis_prompt",
    "get_study_material_generation_prompt",
    "get_section_analysis_prompt",
    "DOCUMENT_PROMPT_FRAGMENTS",
]
