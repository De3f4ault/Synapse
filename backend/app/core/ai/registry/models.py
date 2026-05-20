"""
Model Registry — Single source of truth for all available models.

Models are chosen for what they are good at, not who made them.
"""

from app.core.ai.contracts.capability import AICapability, Tier
from app.core.ai.contracts.model_descriptor import ModelDescriptor


# =============================================================================
# OLLAMA MODELS
# =============================================================================

DEEPSEEK_V31 = ModelDescriptor(
    model_id="deepseek-v3.1:671b-cloud",
    provider="ollama",
    capabilities=frozenset(
        {
            AICapability.DEEP_ABSTRACTION,
            AICapability.ARCHITECTURAL_PLANNING,
            AICapability.STREAM_THOUGHTS,
        }
    ),
    max_context_tokens=128_000,
    supports_multimodal=False,
    cost_tier="free",
    tier=Tier.THINKING,
    fallback_id="qwen3_next",
    supports_thinking=True,
    strengths=(
        "Deep abstraction",
        "Philosophical reasoning",
        "System-level synthesis",
        "Extended reasoning with visible thoughts",
    ),
    known_limitations=("Slower response times",),
)

DEEPSEEK_V32 = ModelDescriptor(
    model_id="deepseek-v3.2:cloud",
    provider="ollama",
    capabilities=frozenset(
        {
            AICapability.DEEP_ABSTRACTION,
            AICapability.ARCHITECTURAL_PLANNING,
        }
    ),
    max_context_tokens=128_000,
    supports_multimodal=False,
    cost_tier="free",
    tier=Tier.BALANCED,
    fallback_id="gemini_flash",
    supports_thinking=False,
    strengths=(
        "Improved reasoning",
        "Agent performance",
    ),
    known_limitations=(),
)

QWEN3_CODER = ModelDescriptor(
    model_id="qwen3-coder:480b-cloud",
    provider="ollama",
    capabilities=frozenset(
        {
            AICapability.PRODUCTION_CODE,
            AICapability.ARCHITECTURAL_PLANNING,
            AICapability.LONG_CONTEXT,
        }
    ),
    max_context_tokens=256_000,
    supports_multimodal=False,
    cost_tier="free",
    tier=Tier.REASONING,
    fallback_id="deepseek_v3_2",
    supports_thinking=False,
    strengths=(
        "Production-quality code",
        "Large context recall",
        "Deterministic output",
    ),
    known_limitations=("Not philosophy-first",),
)

QWEN3_NEXT = ModelDescriptor(
    model_id="qwen3-next:80b-cloud",
    provider="ollama",
    capabilities=frozenset(
        {
            AICapability.SELF_VERIFICATION,
            AICapability.FORMAL_REASONING,
            AICapability.LONG_CONTEXT,
            AICapability.STREAM_THOUGHTS,
        }
    ),
    max_context_tokens=256_000,
    supports_multimodal=False,
    cost_tier="free",
    tier=Tier.REASONING,
    fallback_id="gemini_pro",
    supports_thinking=True,
    strengths=(
        "Logic and math",
        "Self-correction",
        "Long context processing",
        "Thinking transparency",
    ),
    known_limitations=("Less creative",),
)

GPT_OSS_120B = ModelDescriptor(
    model_id="gpt-oss:120b-cloud",
    provider="ollama",
    capabilities=frozenset(
        {
            AICapability.HIGH_ACCURACY,
            AICapability.FORMAL_REASONING,
        }
    ),
    max_context_tokens=128_000,
    supports_multimodal=False,
    cost_tier="free",
    tier=Tier.BALANCED,
    fallback_id="gemini_flash",
    supports_thinking=False,
    strengths=(
        "OpenAI-style reasoning",
        "Natural dialogue",
        "Socratic teaching",
    ),
    known_limitations=(),
)

GPT_OSS_20B = ModelDescriptor(
    model_id="gpt-oss:20b-cloud",
    provider="ollama",
    capabilities=frozenset(
        {
            AICapability.HIGH_ACCURACY,
        }
    ),
    max_context_tokens=128_000,
    supports_multimodal=False,
    cost_tier="free",
    tier=Tier.SPEED,
    fallback_id="gemini_flash",
    supports_thinking=False,
    strengths=(
        "Fast inference",
        "Low latency",
        "Summarization",
    ),
    known_limitations=("Shallow reasoning",),
)

QWEN3_VL = ModelDescriptor(
    model_id="qwen3-vl:235b-cloud",
    provider="ollama",
    capabilities=frozenset(
        {
            AICapability.MULTIMODAL_VISION,
            AICapability.HIGH_ACCURACY,
            AICapability.FORMAL_REASONING,
        }
    ),
    max_context_tokens=128_000,
    supports_multimodal=True,
    cost_tier="free",
    tier=Tier.REASONING,
    fallback_id="gemini_pro",
    supports_thinking=False,
    strengths=(
        "Vision understanding",
        "Image analysis",
        "OCR and document parsing",
        "Visual reasoning",
    ),
    known_limitations=("Requires image input for best results",),
)

GEMMA4_31B = ModelDescriptor(
    model_id="gemma4:31b-cloud",
    provider="ollama",
    capabilities=frozenset(
        {
            AICapability.HIGH_ACCURACY,
            AICapability.MULTIMODAL_VISION,
        }
    ),
    max_context_tokens=128_000,
    supports_multimodal=True,
    cost_tier="free",
    tier=Tier.SPEED,
    fallback_id="gemini_flash",
    supports_thinking=False,
    strengths=(
        "Fast conversational responses",
        "Excellent instruction-following",
        "Socratic tutoring",
        "Low latency streaming",
    ),
    known_limitations=("Less strong on deep multi-step reasoning",),
)


# =============================================================================
# GOOGLE MODELS
# =============================================================================

GEMINI_FLASH = ModelDescriptor(
    model_id="gemini-2.5-flash",
    provider="google",
    capabilities=frozenset(
        {
            AICapability.MULTIMODAL_VISION,
            AICapability.HIGH_ACCURACY,
        }
    ),
    max_context_tokens=1_000_000,
    supports_multimodal=True,
    cost_tier="medium",
    tier=Tier.SPEED,
    fallback_id=None,  # Ultimate fallback
    supports_thinking=False,
    strengths=(
        "Fast responses",
        "Multimodal vision",
        "Huge context window",
    ),
    known_limitations=(),
)

GEMINI_PRO = ModelDescriptor(
    model_id="gemini-1.5-pro",
    provider="google",
    capabilities=frozenset(
        {
            AICapability.MULTIMODAL_VISION,
            AICapability.HIGH_ACCURACY,
            AICapability.LONG_CONTEXT,
        }
    ),
    max_context_tokens=2_000_000,
    supports_multimodal=True,
    cost_tier="medium",
    tier=Tier.REASONING,
    fallback_id="gemini_flash",
    supports_thinking=False,
    strengths=(
        "Document understanding",
        "Extended context",
    ),
    known_limitations=(),
)

GEMINI_THINKING = ModelDescriptor(
    model_id="gemini-2.0-flash-thinking",
    provider="google",
    capabilities=frozenset(
        {
            AICapability.DEEP_ABSTRACTION,
            AICapability.STREAM_THOUGHTS,
        }
    ),
    max_context_tokens=32_000,
    supports_multimodal=False,
    cost_tier="medium",
    tier=Tier.THINKING,
    fallback_id="gemini_pro",
    supports_thinking=True,
    strengths=(
        "Extended reasoning",
        "Visible thinking process",
    ),
    known_limitations=("Smaller context window",),
)


# =============================================================================
# MODEL REGISTRY
# =============================================================================

MODEL_REGISTRY: dict[str, ModelDescriptor] = {
    # Ollama (Cloud)
    "deepseek_v3_1": DEEPSEEK_V31,
    "deepseek_v3_2": DEEPSEEK_V32,
    "qwen3_coder": QWEN3_CODER,
    "qwen3_next": QWEN3_NEXT,
    "qwen3_vl": QWEN3_VL,  # Vision model
    "gpt_oss_120b": GPT_OSS_120B,
    "gpt_oss_20b": GPT_OSS_20B,
    "gemma4_31b": GEMMA4_31B,  # Fast conversational — card tutor
    # Google
    "gemini_flash": GEMINI_FLASH,
    "gemini_pro": GEMINI_PRO,
    "gemini_thinking": GEMINI_THINKING,
}


# =============================================================================
# TIER DEFAULTS — Ordered preference for each tier
# =============================================================================

TIER_DEFAULTS: dict[Tier, list[str]] = {
    Tier.SPEED: ["gemma4_31b", "gpt_oss_20b", "gemini_flash"],
    Tier.BALANCED: ["deepseek_v3_2", "gpt_oss_120b", "gemini_flash"],
    Tier.REASONING: ["qwen3_next", "qwen3_coder", "qwen3_vl", "gemini_pro"],
    Tier.THINKING: ["deepseek_v3_1", "gemini_thinking"],
}


# =============================================================================
# DEFAULT MODEL CONSTANTS — Import these instead of hardcoding model strings
# =============================================================================

DEFAULT_CHAT_MODEL = GEMINI_FLASH.model_id        # "gemini-2.5-flash" — main chat
DEFAULT_CARD_TUTOR_MODEL = GEMMA4_31B.model_id    # "gemma4:31b-cloud" — fast, non-thinking, conversational
DEFAULT_GENERATION_MODEL = GEMINI_PRO.model_id    # "gemini-1.5-pro"
DEFAULT_SPEED_MODEL = GPT_OSS_20B.model_id        # fast, cheap
DEFAULT_CACHE_MODEL = "gemini-2.0-flash-001"      # caching requires versioned model
DEFAULT_TOKENIZER_MODEL = "gemini-2.0-flash"      # for token counting only


def get_model(model_key: str) -> ModelDescriptor:
    """Get a model by registry key."""
    if model_key not in MODEL_REGISTRY:
        raise KeyError(f"Unknown model: {model_key}. Available: {list(MODEL_REGISTRY.keys())}")
    return MODEL_REGISTRY[model_key]


def get_models_by_tier(tier: Tier) -> list[ModelDescriptor]:
    """Get all models for a tier, in preference order."""
    keys = TIER_DEFAULTS.get(tier, [])
    return [MODEL_REGISTRY[k] for k in keys if k in MODEL_REGISTRY]


def get_thinking_models() -> list[ModelDescriptor]:
    """Get all models that support thinking transparency."""
    return [m for m in MODEL_REGISTRY.values() if m.supports_thinking]
