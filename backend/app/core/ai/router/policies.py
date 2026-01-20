"""
Routing Policies — Task-to-Model mapping.

This is the brain of the router.
Explicit, auditable, debuggable.
"""

from app.core.ai.contracts.task import AITask


# =============================================================================
# TASK → MODEL MAPPING
# =============================================================================

TASK_TO_MODEL: dict[AITask, str] = {
    # Reasoning (THEORIST → DeepSeek V3.1)
    AITask.ABSTRACT_REASONING: "deepseek_v3_1",
    AITask.ARCHITECTURE_DESIGN: "deepseek_v3_1",
    # Engineering (BUILDER → Qwen3-Coder)
    AITask.CODE_GENERATION: "qwen3_coder",
    AITask.CODE_REFACTORING: "qwen3_coder",
    # Verification (AUDITOR → Qwen3-Next)
    AITask.MATHEMATICAL_SOLVING: "qwen3_next",
    AITask.LOGICAL_VERIFICATION: "qwen3_next",
    AITask.LONG_CONTEXT_SYNTHESIS: "qwen3_next",
    # Teaching (TUTOR → GPT-OSS 120B)
    AITask.EXPLANATION: "gpt_oss_120b",
    AITask.GENERAL_ASSISTANCE: "gpt_oss_120b",
    # Fast tasks (ANALYZER → GPT-OSS 20B)
    AITask.SUMMARIZATION: "gpt_oss_20b",
    AITask.CONTEXTUAL_QA: "gpt_oss_120b",
    AITask.SEMANTIC_REWRITE: "gpt_oss_20b",
    # Planning (PLANNER → DeepSeek V3.2)
    AITask.TASK_DECOMPOSITION: "deepseek_v3_2",
    AITask.WORKFLOW_ORCHESTRATION: "deepseek_v3_2",
    # Multimodal (Gemini fallback)
    AITask.IMAGE_REASONING: "gemini_pro",
    AITask.DOCUMENT_UNDERSTANDING: "gemini_pro",
}


# =============================================================================
# FALLBACK CHAIN
# =============================================================================

FALLBACK_CHAIN: dict[str, list[str]] = {
    "deepseek_v3_1": ["deepseek_v3_2", "gpt_oss_120b"],
    "deepseek_v3_2": ["deepseek_v3_1", "gpt_oss_120b"],
    "qwen3_coder": ["deepseek_v3_1", "gpt_oss_120b"],
    "qwen3_next": ["gpt_oss_120b", "deepseek_v3_1"],
    "gpt_oss_120b": ["qwen3_next", "deepseek_v3_1"],
    "gpt_oss_20b": ["gpt_oss_120b"],
    "gemini_pro": ["gpt_oss_120b"],  # Fallback for multimodal if Gemini fails
}
