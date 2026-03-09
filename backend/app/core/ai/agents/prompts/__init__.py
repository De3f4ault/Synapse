"""
Agent Prompt Templates

Reusable prompt components for all agents and modes.
Centralized prompt management for consistency and maintainability.

Architecture:
- Each mode has its own dedicated prompt file with a get_system_prompt(context) function
- Tutor and Document agents have additional shared components (patterns, strategies, etc.)
- Mode prompts are loaded by modes/config.py and injected into agents via context
"""

# ─────────────────────────────────────────────────────────────────────
# MODE PROMPTS — Each mode has a dedicated get_system_prompt(context)
# ─────────────────────────────────────────────────────────────────────
from app.core.ai.agents.prompts import direct_prompts
from app.core.ai.agents.prompts import creative_prompts
from app.core.ai.agents.prompts import research_prompts
from app.core.ai.agents.prompts import deep_dive_prompts
from app.core.ai.agents.prompts import vision_prompts

# ─────────────────────────────────────────────────────────────────────
# AGENT-SPECIFIC PROMPTS — Shared components for specialized agents
# ─────────────────────────────────────────────────────────────────────
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

# ─────────────────────────────────────────────────────────────────────
# MODE PROMPT REGISTRY — Maps mode IDs to prompt modules
# ─────────────────────────────────────────────────────────────────────
MODE_PROMPT_REGISTRY = {
    "direct": direct_prompts,
    "creative": creative_prompts,
    "research": research_prompts,
    "deep_dive": deep_dive_prompts,
    "deep_think": deep_dive_prompts,  # Alias
    "vision": vision_prompts,
}


def get_mode_prompt(mode_id: str, context: dict) -> str:
    """
    Get the system prompt for a specific mode.

    Args:
        mode_id: Mode identifier (direct, creative, research, deep_dive, vision)
        context: User context dict with weak_areas, recent_topics, etc.

    Returns:
        Complete system prompt string, or empty string if mode not found
    """
    module = MODE_PROMPT_REGISTRY.get(mode_id)
    if module and hasattr(module, "get_system_prompt"):
        return module.get_system_prompt(context)
    return ""


__all__ = [
    # Mode prompt modules
    "direct_prompts",
    "creative_prompts",
    "research_prompts",
    "deep_dive_prompts",
    "vision_prompts",
    "MODE_PROMPT_REGISTRY",
    "get_mode_prompt",
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
