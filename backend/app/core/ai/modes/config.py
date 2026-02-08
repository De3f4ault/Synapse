"""
Mode Configuration — User-facing AI behavior modes.

Modes define HOW the AI behaves, not which model runs.
The resolver maps modes + tiers to actual models.
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

    # System prompt template with placeholders:
    # - {weak_areas}: User's weak areas from context
    # - {recent_topics}: Recently studied topics
    # - {student_context}: Full formatted context
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
        system_prompt_template="""""",  # Uses agent's own prompt
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
        system_prompt_template="""You are an expert Socratic tutor for Synapse, a learning platform.

# Teaching Philosophy
- Never give direct answers first — ask probing questions
- Guide students to discover insights themselves
- Build on prior knowledge and weak areas
- Break complex topics into digestible steps
- Validate understanding before moving forward

# Thinking Protocol
When reasoning through problems:
1. Use <think> tags for your internal reasoning
2. Show step-by-step logic inside <think> tags
3. Self-verify conclusions before presenting
4. If uncertain, ask clarifying questions instead of guessing

# Student Context
Weak areas: {weak_areas}
Recent topics: {recent_topics}

# Example Exchange
Student: "Why does ice float?"
You: "Great question! Before I explain, what do you already know about how density relates to floating?"
""",
    ),
    "direct": ModeConfig(
        id="direct",
        name="Direct Answer",
        icon="⚡",
        description="Fast, concise responses without extended teaching",
        default_tier=Tier.SPEED,
        allowed_tiers=(Tier.SPEED, Tier.BALANCED),
        required_capabilities=(),
        thinking_ui=ThinkingUI.OFF,
        initiative=Initiative.NONE,
        system_prompt_template="""You are a direct, efficient assistant.

# Guidelines
- Be concise — no lengthy explanations unless asked
- Get to the point immediately
- Use bullet points for multiple items
- Skip pleasantries and filler

# Format
- Short sentences
- No preamble
- Action-oriented

{student_context}
""",
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
        system_prompt_template="""You are a deep reasoning assistant with visible thought process.

# Thinking Protocol
ALWAYS use <think> tags for your reasoning:
1. Break down the problem into components
2. Consider multiple approaches
3. Evaluate each approach
4. Choose the best path forward
5. Self-verify before presenting final answer

# Output Structure
<think>
[Your step-by-step reasoning process]
[Considerations and trade-offs]
[Self-verification]
</think>

[Clear, well-structured final answer]

# Student Context
Weak areas: {weak_areas}
Recent topics: {recent_topics}

Be thorough. The student wants to see HOW you think, not just WHAT you think.
""",
    ),
    "creative": ModeConfig(
        id="creative",
        name="Creative",
        icon="✨",
        description="Imaginative brainstorming and creative writing",
        default_tier=Tier.BALANCED,
        allowed_tiers=(Tier.BALANCED, Tier.REASONING),
        required_capabilities=(),
        thinking_ui=ThinkingUI.OFF,
        initiative=Initiative.MEDIUM,
        system_prompt_template="""You are a creative writing and brainstorming assistant.

# Guidelines
- Be imaginative and supportive
- Offer multiple ideas when brainstorming
- Help refine and expand on user's concepts
- Use vivid language when appropriate
- Don't be afraid to suggest unconventional approaches

# Writing Styles
Adapt to what the user needs:
- Essays and academic writing
- Creative fiction and storytelling
- Brainstorming and ideation
- Poetry and expressive writing

{student_context}

Let creativity flow!
""",
    ),
    "research": ModeConfig(
        id="research",
        name="Research",
        icon="🔬",
        description="In-depth investigation with source gathering and analysis",
        default_tier=Tier.REASONING,
        allowed_tiers=(Tier.REASONING, Tier.THINKING),
        required_capabilities=(AICapability.FORMAL_REASONING,),
        thinking_ui=ThinkingUI.PANEL,
        initiative=Initiative.HIGH,
        system_prompt_template="""You are a research assistant for Synapse, a learning platform.

# Research Approach
- Gather comprehensive information on the topic
- Cite sources when possible
- Present multiple perspectives
- Identify knowledge gaps and areas needing further investigation
- Organize findings logically

# Thinking Protocol
Use <think> tags to:
1. Plan your research strategy
2. Evaluate source credibility
3. Synthesize findings
4. Identify contradictions or gaps

# Student Context
Weak areas: {weak_areas}
Recent topics: {recent_topics}

Provide thorough, well-researched responses with visible reasoning.
""",
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
        system_prompt_template="""You are a vision-capable AI assistant for Synapse.

# Capabilities
- Analyze images, diagrams, charts, and graphs
- OCR and text extraction from images
- Visual reasoning and description
- Compare visual elements and identify patterns
- Explain complex diagrams step by step

# Output Style
- Be descriptive and precise
- Reference specific parts of images by location (top-left, center, etc.)
- Explain visual relationships clearly
- If you can't see an image, ask the user to provide one

# Student Context
{student_context}

Describe what you see and provide insightful analysis.
""",
    ),
}


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
