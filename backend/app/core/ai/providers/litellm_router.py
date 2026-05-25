"""
LiteLLM Router — Central provider singleton for all Synapse LLM completion calls.

This is the SINGLE SOURCE OF TRUTH for all model/provider decisions in the
streaming path. The orchestrator and agents speak only in capability aliases
(e.g. "synapse-chat"). The Router handles provider selection, failover,
cooldown, and rate-limit shuffling transparently.

                ┌─────────────────────────────────────────┐
                │            Synapse Orchestrator          │
                │  (decides intent + which alias to use)  │
                └──────────────────┬──────────────────────┘
                                   │  router.acompletion("synapse-chat")
                ┌──────────────────▼──────────────────────┐
                │          LiteLLM Router (this file)      │
                │  Tries primary → cooldown → fallback    │
                └─────────┬──────────────────┬────────────┘
                           │                  │
              ┌────────────▼──┐       ┌───────▼────────┐
              │  Ollama Local  │       │  Gemini Cloud  │
              │ (gpt-oss:120b) │       │ (Flash / Pro)  │
              └───────────────┘       └────────────────┘

Capability Aliases
──────────────────
  synapse-chat               Fast general chat. Primary: gpt-oss:120b → gemini-2.5-flash
  synapse-reasoning          Default deep reasoning. Primary: qwen3-next:80b → deepseek-v3.2 (last resort)
  synapse-deepseek-explicit  User-pinned DeepSeek. Primary: deepseek-v3.2 → qwen3-next:80b fallback
  synapse-coding             Code generation. Primary: qwen3-coder:480b → gemini-2.5-flash
  synapse-vision             Multimodal. Primary: qwen3-vl:235b → gemini-2.5-flash
  synapse-utility            Short calls. Primary: gemini-flash-lite → gemma4

Model Picker → Alias Mapping (REGISTRY_KEY_TO_ALIAS)
─────────────────────────────────────────────────────
  deepseek_v3_1 / deepseek_v3_2 → synapse-deepseek-explicit (DeepSeek first)
  qwen3_next                    → synapse-reasoning
  qwen3_vl                      → synapse-vision (always vision alias)
  image_bytes present           → auto-upgraded to synapse-vision

Mode → Alias Mapping (MODE_TO_ALIAS)
──────────────────────────────────────
  direct / creative / auto → synapse-chat
  socratic / tutor / deep_dive / deep_think / research → synapse-reasoning
  vision → synapse-vision

NOTE: GeminiProvider is NOT deleted — it is kept for Gemini Context Caching
(create_context_cache / generate_with_cache) which LiteLLM does not wrap.

Usage:
    from app.core.ai.providers.litellm_router import get_llm_router, mode_to_alias

    alias = mode_to_alias("direct")              # → "synapse-chat"
    router = get_llm_router()
    response = await router.acompletion(
        model=alias,
        messages=[{"role": "user", "content": prompt}],
        stream=True,
    )

Docs: https://docs.litellm.ai/docs/routing
"""

import os
import structlog

logger = structlog.get_logger(__name__)

# ── Ollama base URL ──────────────────────────────────────────────────────────
# Standardized on OLLAMA_BASE_URL across the entire stack.
# OLLAMA_API_BASE was the old name — removed to avoid silent misconfiguration
# where one service picked up a different env var and used localhost while
# another used host.docker.internal. One name, one value, one source of truth.
_OLLAMA_BASE = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
_GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")

# ── Model registry for the Router ────────────────────────────────────────────
# Lower `order` = higher priority. The Router auto-promotes to next order when
# the current deployment fails (429, timeout, 5xx).
# Docs: https://docs.litellm.ai/docs/routing#routing-strategies
_MODEL_LIST = [



    # =========================================================================
    # synapse-reasoning — Default deep reasoning path
    # Ollama chain:  qwen3-next:80b → deepseek-v3.2 (last Ollama resort)
    # Gemini tail:   gemini-2.5-pro → gemini-2.5-flash → gemini-2.5-flash-lite
    # The Gemini tail activates when Ollama is unreachable or both Ollama
    # models exhaust their allowed_fails budget.
    # =========================================================================
    {
        "model_name": "synapse-reasoning",
        "litellm_params": {
            "model": "ollama/qwen3-next:80b-cloud",
            "api_base": _OLLAMA_BASE,
            "order": 1,
            "timeout": 60.0,
            "stream_timeout": 180.0,
        },
    },
    {
        "model_name": "synapse-reasoning",
        "litellm_params": {
            "model": "ollama/deepseek-v3.2:cloud",
            "api_base": _OLLAMA_BASE,
            "order": 2,
            # DeepSeek is last resort for the default chain — only reached if
            # Qwen3-Next fails. Kept with a generous timeout since it's cloud-proxied.
            "timeout": 90.0,
            "stream_timeout": 180.0,
        },
    },
    # ── Gemini tail: Ollama-down safety net ──────────────────────────────────
    {
        "model_name": "synapse-reasoning",
        "litellm_params": {
            "model": "gemini/gemini-2.5-pro",
            "api_key": _GEMINI_KEY,
            "order": 3,
            "timeout": 30.0,
            "stream_timeout": 180.0,
        },
    },
    {
        "model_name": "synapse-reasoning",
        "litellm_params": {
            "model": "gemini/gemini-2.5-flash",
            "api_key": _GEMINI_KEY,
            "order": 4,
            "timeout": 15.0,
            "stream_timeout": 90.0,
        },
    },
    {
        "model_name": "synapse-reasoning",
        "litellm_params": {
            "model": "gemini/gemini-2.5-flash-lite",
            "api_key": _GEMINI_KEY,
            "order": 5,
            "timeout": 10.0,
            "stream_timeout": 60.0,
        },
    },

    # =========================================================================
    # synapse-deepseek-explicit — User-pinned DeepSeek selection
    # Ollama chain:  deepseek-v3.2 → qwen3-next:80b
    # Gemini tail:   gemini-2.5-pro → gemini-2.5-flash → gemini-2.5-flash-lite
    # =========================================================================
    {
        "model_name": "synapse-deepseek-explicit",
        "litellm_params": {
            "model": "ollama/deepseek-v3.2:cloud",
            "api_base": _OLLAMA_BASE,
            "order": 1,
            "timeout": 90.0,
            "stream_timeout": 180.0,
        },
    },
    {
        "model_name": "synapse-deepseek-explicit",
        "litellm_params": {
            "model": "ollama/qwen3-next:80b-cloud",
            "api_base": _OLLAMA_BASE,
            "order": 2,
            "timeout": 60.0,
            "stream_timeout": 180.0,
        },
    },
    # ── Gemini tail ──────────────────────────────────────────────────────────
    {
        "model_name": "synapse-deepseek-explicit",
        "litellm_params": {
            "model": "gemini/gemini-2.5-pro",
            "api_key": _GEMINI_KEY,
            "order": 3,
            "timeout": 30.0,
            "stream_timeout": 180.0,
        },
    },
    {
        "model_name": "synapse-deepseek-explicit",
        "litellm_params": {
            "model": "gemini/gemini-2.5-flash",
            "api_key": _GEMINI_KEY,
            "order": 4,
            "timeout": 15.0,
            "stream_timeout": 90.0,
        },
    },
    {
        "model_name": "synapse-deepseek-explicit",
        "litellm_params": {
            "model": "gemini/gemini-2.5-flash-lite",
            "api_key": _GEMINI_KEY,
            "order": 5,
            "timeout": 10.0,
            "stream_timeout": 60.0,
        },
    },

    # =========================================================================
    # synapse-coding — Code generation and refactoring
    # Ollama: qwen3-coder:480b  |  Gemini tail: Flash → Flash-Lite
    # (Pro not used here — Flash handles code well and is faster)
    # =========================================================================
    {
        "model_name": "synapse-coding",
        "litellm_params": {
            "model": "ollama/qwen3-coder:480b-cloud",
            "api_base": _OLLAMA_BASE,
            "order": 1,
            "timeout": 30.0,
            "stream_timeout": 180.0,
        },
    },
    {
        "model_name": "synapse-coding",
        "litellm_params": {
            "model": "gemini/gemini-2.5-flash",
            "api_key": _GEMINI_KEY,
            "order": 2,
            "timeout": 15.0,
            "stream_timeout": 90.0,
        },
    },
    {
        "model_name": "synapse-coding",
        "litellm_params": {
            "model": "gemini/gemini-2.5-flash-lite",
            "api_key": _GEMINI_KEY,
            "order": 3,
            "timeout": 10.0,
            "stream_timeout": 60.0,
        },
    },

    # =========================================================================
    # synapse-chat — Fast general conversation
    # Ollama: gpt-oss:120b  |  Gemini tail: Flash → Flash-Lite
    # =========================================================================
    {
        "model_name": "synapse-chat",
        "litellm_params": {
            "model": "ollama/gpt-oss:120b-cloud",
            "api_base": _OLLAMA_BASE,
            "order": 1,
            "timeout": 20.0,
            "stream_timeout": 120.0,
        },
    },
    {
        "model_name": "synapse-chat",
        "litellm_params": {
            "model": "gemini/gemini-2.5-flash",
            "api_key": _GEMINI_KEY,
            "order": 2,
            "timeout": 10.0,
            "stream_timeout": 60.0,
        },
    },
    {
        "model_name": "synapse-chat",
        "litellm_params": {
            "model": "gemini/gemini-2.5-flash-lite",
            "api_key": _GEMINI_KEY,
            "order": 3,
            "timeout": 8.0,
            "stream_timeout": 45.0,
        },
    },

    # =========================================================================
    # synapse-vision — Multimodal image + document analysis
    # Primary: qwen3-vl:235b-cloud (auto-routed when image_bytes present)
    # Gemini tail: Flash (native vision, reliable) → Flash-Lite
    # Note: Gemini Flash has vision support; Flash-Lite is last resort.
    # =========================================================================
    {
        "model_name": "synapse-vision",
        "litellm_params": {
            "model": "ollama/qwen3-vl:235b-cloud",
            "api_base": _OLLAMA_BASE,
            "order": 1,
            # 235b VL model is cloud-proxied; first-byte can be 30-60s under load.
            "timeout": 75.0,
            "stream_timeout": 180.0,
        },
    },
    {
        "model_name": "synapse-vision",
        "litellm_params": {
            "model": "gemini/gemini-2.5-flash",
            "api_key": _GEMINI_KEY,
            "order": 2,
            "timeout": 15.0,
            "stream_timeout": 90.0,
        },
    },
    {
        "model_name": "synapse-vision",
        "litellm_params": {
            "model": "gemini/gemini-2.5-flash-lite",
            "api_key": _GEMINI_KEY,
            "order": 3,
            "timeout": 10.0,
            "stream_timeout": 60.0,
        },
    },

    {
        "model_name": "synapse-utility",
        "litellm_params": {
            "model": "gemini/gemini-2.5-flash-lite",
            "api_key": _GEMINI_KEY,
            "order": 1,
            "timeout": 8.0,
        },
    },
    {
        "model_name": "synapse-utility",
        "litellm_params": {
            "model": "ollama/gemma4:31b-cloud",
            "api_base": _OLLAMA_BASE,
            "order": 2,
            "timeout": 15.0,
        },
    },

    # =========================================================================
    # synapse-tutor — Card Tutor & Socratic conversational teaching
    # Primary: gemma4:31b-cloud — fast, non-thinking, excellent instruction
    #   following; ideal for Socratic back-and-forth.
    # Fallback: gemini-2.5-flash-lite → gemini-2.5-flash
    # Deliberately NOT using synapse-reasoning: tutoring is conversational,
    # not multi-step reasoning. Heavy models add latency with no benefit.
    # =========================================================================
    {
        "model_name": "synapse-tutor",
        "litellm_params": {
            "model": "ollama/gemma4:31b-cloud",
            "api_base": _OLLAMA_BASE,
            "order": 1,
            "timeout": 25.0,
            "stream_timeout": 90.0,
        },
    },
    {
        "model_name": "synapse-tutor",
        "litellm_params": {
            "model": "gemini/gemini-2.5-flash-lite",
            "api_key": _GEMINI_KEY,
            "order": 2,
            "timeout": 10.0,
            "stream_timeout": 60.0,
        },
    },
    {
        "model_name": "synapse-tutor",
        "litellm_params": {
            "model": "gemini/gemini-2.5-flash",
            "api_key": _GEMINI_KEY,
            "order": 3,
            "timeout": 15.0,
            "stream_timeout": 90.0,
        },
    },
]


# =============================================================================
# MODE → ALIAS MAPPING
# =============================================================================
# Maps every user-facing mode ID (from ModeConfig.id) to a router alias.
# This replaces the entire resolver.py → registry/models.py → TIER_DEFAULTS
# chain for the streaming path.
#
# Rule: if a mode requires deep reasoning, use synapse-reasoning.
#       if a mode is fast/conversational, use synapse-chat.
#       code mode → synapse-coding.
#       vision mode → synapse-vision.
#       anything else → synapse-chat (safe default).
# =============================================================================

MODE_TO_ALIAS: dict[str, str] = {
    # Fast conversation / direct answers
    "direct":     "synapse-chat",
    "creative":   "synapse-chat",
    "auto":       "synapse-chat",
    # Socratic / tutoring — routed to synapse-tutor (fast, non-thinking)
    # NOT synapse-reasoning: card tutoring is conversational, not multi-step.
    "socratic":   "synapse-tutor",
    "tutor":      "synapse-tutor",
    # Heavy reasoning / research
    "deep_dive":  "synapse-reasoning",
    "deep_think": "synapse-reasoning",
    "research":   "synapse-reasoning",
    # Vision / multimodal
    "vision":     "synapse-vision",
}

# Maps MODEL_REGISTRY keys (sent by the frontend model picker) to LiteLLM
# Router aliases. Only keys that need special alias treatment are listed;
# anything not mapped falls back to the mode-derived alias.
REGISTRY_KEY_TO_ALIAS: dict[str, str] = {
    # DeepSeek explicit selection — uses the DeepSeek-first alias
    "deepseek_v3_2":  "synapse-deepseek-explicit",
    "deepseek_v3_1":  "synapse-deepseek-explicit",
    # Qwen reasoning — maps to the standard reasoning alias
    "qwen3_next":     "synapse-reasoning",
    "qwen3_coder":    "synapse-coding",
    # Vision models — always route to vision alias
    "qwen3_vl":       "synapse-vision",
    # General chat models
    "gpt_oss_120b":   "synapse-chat",
    "gpt_oss_20b":    "synapse-chat",
    # Google fallbacks (user may pick these from the picker)
    "gemini_flash":   "synapse-chat",
    "gemini_pro":     "synapse-reasoning",
    # Gemma4 — fast conversational; maps to tutor alias
    "gemma4_31b":     "synapse-tutor",
}


def mode_to_alias(mode_id: str) -> str:
    """
    Translate a Synapse mode ID to a LiteLLM Router alias.

    The orchestrator calls this instead of resolver.resolve() for the streaming
    path. The Router then decides which actual model/provider to use.

    Args:
        mode_id: User-facing mode ID (e.g. "direct", "socratic", "vision")

    Returns:
        LiteLLM Router alias string (e.g. "synapse-chat", "synapse-reasoning")
    """
    return MODE_TO_ALIAS.get(mode_id, "synapse-chat")


# =============================================================================
# LEGACY COMPAT — kept for services that still use the old alias map
# =============================================================================

# Map from Synapse internal model registry keys → LiteLLM model string.
# Used by BaseAgent for the non-streaming cognitive router path.
REGISTRY_KEY_TO_LITELLM: dict[str, str] = {
    "gemini_flash":      "gemini/gemini-2.5-flash",
    "gemini_flash_lite": "gemini/gemini-2.5-flash-lite",
    "gemini_pro":        "gemini/gemini-2.5-pro",
    "qwen3_vl":          "ollama/qwen3-vl:235b-cloud",
    "qwen3_vl_4b":       "ollama/qwen3-vl:4b",
    "qwen3_vl_2b":       "ollama/qwen3-vl:2b",
    "qwen3_next":        "ollama/qwen3-next:80b-cloud",
    "qwen3_coder":       "ollama/qwen3-coder:480b-cloud",
    "gpt_oss_120b":      "ollama/gpt-oss:120b-cloud",
    "deepseek_v3_2":     "ollama/deepseek-v3.2:cloud",
    "deepseek_v3_1":     "ollama/deepseek-v3.1:671b-cloud",
    "gemma4":            "ollama/gemma4:31b-cloud",
    "glm":               "ollama/glm-5.1:cloud",
}


def build_litellm_model(provider: str, model_id: str) -> str:
    """
    Translate a Synapse cognitive-router decision into a LiteLLM model string.
    Kept for backward compatibility with non-streaming execute() path.

    Args:
        provider: "google" | "ollama" | "openai" | "anthropic"
        model_id: The model's actual ID (e.g. "gemini-2.5-flash")

    Returns:
        LiteLLM-compatible model string (e.g. "gemini/gemini-2.5-flash")
    """
    prefix_map = {
        "google":    "gemini",
        "ollama":    "ollama",
        "openai":    "openai",
        "anthropic": "anthropic",
    }
    prefix = prefix_map.get(provider, provider)
    return f"{prefix}/{model_id}"


def registry_key_to_litellm(model_key: str) -> str:
    """
    Translate an orchestrator model_key to a LiteLLM model string.
    Falls back to the synapse-chat alias if the key is unknown.
    """
    return REGISTRY_KEY_TO_LITELLM.get(model_key, "synapse-chat")


# =============================================================================
# SINGLETON
# =============================================================================

_router = None  # type: ignore[var-annotated]  # Router imported lazily inside get_llm_router()


def get_llm_router() -> "Router":
    """
    Get the global LiteLLM Router singleton.

    Lazy-initialized on first call, reused for the process lifetime.

    Returns:
        litellm.Router configured with Synapse's model list and fallback rules.
    """
    global _router
    if _router is None:
        from litellm import Router  # Deferred: litellm takes ~8s to import; skip at module level
        _router = Router(
            model_list=_MODEL_LIST,
            # simple-shuffle: recommended default. Uses RPM/TPM weights if
            # provided; otherwise picks randomly among equally-ordered models.
            routing_strategy="simple-shuffle",
            # Cooldown a deployment after 1 failure for 30s.
            # Prevents an offline Ollama or rate-limited Gemini endpoint from monopolising retries.
            allowed_fails=1,
            # Must be >= the number of models in a group for failover to work!
            # Otherwise it exhausts retries before reaching the Gemini fallback.
            num_retries=3,
            cooldown_time=30,
            set_verbose=False,
        )
        aliases = sorted({m["model_name"] for m in _MODEL_LIST})
        logger.info(
            "litellm_router_initialized",
            aliases=aliases,
            ollama_base=_OLLAMA_BASE,
        )
    return _router
