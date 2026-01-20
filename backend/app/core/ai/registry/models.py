"""
Model Registry — Single source of truth for all available models.

Models are chosen for what they are good at, not who made them.
"""

from app.core.ai.contracts.capability import AICapability
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
        }
    ),
    max_context_tokens=128_000,
    supports_multimodal=False,
    cost_tier="free",
    strengths=(
        "Deep abstraction",
        "Philosophical reasoning",
        "System-level synthesis",
    ),
    known_limitations=(
        "Not verification-first",
        "Slower response times",
    ),
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
        }
    ),
    max_context_tokens=256_000,
    supports_multimodal=False,
    cost_tier="free",
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
        }
    ),
    max_context_tokens=256_000,
    supports_multimodal=False,
    cost_tier="free",
    strengths=(
        "Logic and math",
        "Self-correction",
        "Long context processing",
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
    strengths=(
        "Fast inference",
        "Low latency",
        "Summarization",
    ),
    known_limitations=("Shallow reasoning",),
)


# =============================================================================
# GOOGLE MODELS (Legacy/Fallback)
# =============================================================================

GEMINI_PRO = ModelDescriptor(
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
    strengths=(
        "Multimodal vision",
        "Document understanding",
    ),
    known_limitations=("Vendor lock-in",),
)


# =============================================================================
# REGISTRY
# =============================================================================

MODEL_REGISTRY: dict[str, ModelDescriptor] = {
    "deepseek_v3_1": DEEPSEEK_V31,
    "deepseek_v3_2": DEEPSEEK_V32,
    "qwen3_coder": QWEN3_CODER,
    "qwen3_next": QWEN3_NEXT,
    "gpt_oss_120b": GPT_OSS_120B,
    "gpt_oss_20b": GPT_OSS_20B,
    "gemini_pro": GEMINI_PRO,
}


def get_model(model_key: str) -> ModelDescriptor:
    """Get a model by registry key."""
    if model_key not in MODEL_REGISTRY:
        raise KeyError(f"Unknown model: {model_key}. Available: {list(MODEL_REGISTRY.keys())}")
    return MODEL_REGISTRY[model_key]
