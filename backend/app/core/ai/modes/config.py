"""
Mode Configuration — User-facing AI behavior modes.

Modes define HOW the AI behaves, not which model runs.
The resolver maps modes + tiers to actual models.

Each mode references its dedicated prompt file in prompts/ for
comprehensive, commercially-quality system prompts.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Tuple

from app.core.ai.contracts.capability import AICapability, Tier


class ThinkingUI(Enum):
    """How thinking content is displayed in the UI."""

    OFF = "off"  # Never show thinking (Direct mode)
    COLLAPSED = "collapsed"  # Show with expand button (Socratic)
    PANEL = "panel"  # Right-side drawer (Deep Dive)


class Initiative(Enum):
    """How proactive the AI is."""

    NONE = "none"  # Only answer when asked
    MEDIUM = "medium"  # Suggest follow-ups, ask clarifying questions
    HIGH = "high"  # Proactively offer insights, anticipate needs


@dataclass(frozen=True)
class ModeConfig:
    """
    Configuration for a user-facing AI mode.

    Modes are the primary way users select AI behavior.
    Each mode maps to a default tier and set of behaviors.

    The system_prompt_template is a LIGHTWEIGHT fallback — the actual
    comprehensive prompt comes from the dedicated prompt file in
    prompts/ (loaded via get_mode_prompt()).
    """

    id: str
    name: str
    icon: str
    description: str

    # Model selection
    default_tier: Tier
    allowed_tiers: Tuple[Tier, ...]
    required_capabilities: Tuple[AICapability, ...] = ()

    # Behavior configuration
    thinking_ui: ThinkingUI = ThinkingUI.COLLAPSED
    initiative: Initiative = Initiative.MEDIUM

    # Prompt module name — references prompts/<module>.py
    # Used by orchestrator to load the dedicated prompt file
    prompt_module: str = ""

    # Lightweight fallback template (used only if prompt_module is empty)
    system_prompt_template: str = ""

    # Agent routing - which agent handles this mode
    # When not "auto", skips intent classification
    agent_name: str = "tutor"  # Default to tutor agent


# =============================================================================
# MODE REGISTRY
# =============================================================================

MODE_REGISTRY: dict[str, ModeConfig] = {
    # Auto mode - uses intent classification to route
    "auto": ModeConfig(
        id="auto",
        name="Auto",
        icon="🤖",
        description="Automatically detect intent and route to best agent",
        agent_name="__classify__",  # Special: triggers intent classification
        default_tier=Tier.BALANCED,
        allowed_tiers=(Tier.SPEED, Tier.BALANCED, Tier.REASONING, Tier.THINKING),
        required_capabilities=(),
        thinking_ui=ThinkingUI.COLLAPSED,
        initiative=Initiative.MEDIUM,
        prompt_module="",  # Uses agent's own prompt
    ),
    "socratic": ModeConfig(
        id="socratic",
        name="Socratic Tutor",
        icon="🎓",
        description="Patient, question-based teaching that guides you to discover answers",
        default_tier=Tier.REASONING,
        allowed_tiers=(Tier.BALANCED, Tier.REASONING, Tier.THINKING),
        required_capabilities=(AICapability.FORMAL_REASONING,),
        thinking_ui=ThinkingUI.COLLAPSED,
        initiative=Initiative.MEDIUM,
        prompt_module="socratic",  # Uses tutor agent's built-in Socratic prompt
    ),
    "direct": ModeConfig(
        id="direct",
        name="Direct Answer",
        icon="⚡",
        description="Fast, efficient responses that get straight to the substance",
        default_tier=Tier.SPEED,
        allowed_tiers=(Tier.SPEED, Tier.BALANCED),
        required_capabilities=(),
        thinking_ui=ThinkingUI.OFF,
        initiative=Initiative.NONE,
        prompt_module="direct",
        agent_name="general",
    ),
    "deep_dive": ModeConfig(
        id="deep_dive",
        name="Deep Reasoning",
        icon="🧠",
        description="Multi-step problem solving with visible reasoning process",
        default_tier=Tier.THINKING,
        allowed_tiers=(Tier.REASONING, Tier.THINKING),
        required_capabilities=(AICapability.STREAM_THOUGHTS,),
        thinking_ui=ThinkingUI.PANEL,
        initiative=Initiative.HIGH,
        prompt_module="deep_dive",
        agent_name="tutor",
    ),
    "creative": ModeConfig(
        id="creative",
        name="Creative",
        icon="✨",
        description="Imaginative brainstorming, vivid writing, and creative exploration",
        default_tier=Tier.BALANCED,
        allowed_tiers=(Tier.BALANCED, Tier.REASONING),
        required_capabilities=(),
        thinking_ui=ThinkingUI.OFF,
        initiative=Initiative.MEDIUM,
        prompt_module="creative",
        agent_name="general",
    ),
    "research": ModeConfig(
        id="research",
        name="Research",
        icon="🔬",
        description="Comprehensive investigation with multi-perspective analysis",
        default_tier=Tier.REASONING,
        allowed_tiers=(Tier.REASONING, Tier.THINKING),
        required_capabilities=(AICapability.FORMAL_REASONING,),
        thinking_ui=ThinkingUI.PANEL,
        initiative=Initiative.HIGH,
        prompt_module="research",
        agent_name="general",
    ),
    "vision": ModeConfig(
        id="vision",
        name="Vision Analysis",
        icon="👁️",
        description="Analyze images, diagrams, charts, and visual content",
        default_tier=Tier.REASONING,
        allowed_tiers=(Tier.BALANCED, Tier.REASONING),
        required_capabilities=(AICapability.MULTIMODAL_VISION,),
        thinking_ui=ThinkingUI.COLLAPSED,
        initiative=Initiative.MEDIUM,
        prompt_module="vision",
        agent_name="general",
    ),
}

# Frontend compatibility aliases — frontend uses shorter IDs
MODE_REGISTRY["tutor"] = MODE_REGISTRY["socratic"]
MODE_REGISTRY["deep_think"] = MODE_REGISTRY["deep_dive"]


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================


def get_mode(mode_id: str) -> ModeConfig:
    """Get a mode by ID, defaulting to socratic if not found."""
    return MODE_REGISTRY.get(mode_id, MODE_REGISTRY["socratic"])


def list_modes() -> list[dict]:
    """Get all modes as dicts for API response."""
    return [
        {
            "id": m.id,
            "name": m.name,
            "icon": m.icon,
            "description": m.description,
            "default_tier": m.default_tier.value,
            "thinking_ui": m.thinking_ui.value,
        }
        for m in MODE_REGISTRY.values()
    ]


def get_modes_with_thinking() -> list[ModeConfig]:
    """Get all modes that display thinking UI."""
    return [m for m in MODE_REGISTRY.values() if m.thinking_ui != ThinkingUI.OFF]
