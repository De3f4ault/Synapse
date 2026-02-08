"""
AICapability — Atomic cognitive capabilities that models advertise.

Models are chosen for what they are good at, not who made them.
"""

from enum import Enum


class AICapability(Enum):
    """
    Atomic cognitive capabilities.
    Models advertise these; router matches tasks to capabilities.
    """

    DEEP_ABSTRACTION = "deep_abstraction"
    FORMAL_REASONING = "formal_reasoning"
    SELF_VERIFICATION = "self_verification"
    LONG_CONTEXT = "long_context"
    PRODUCTION_CODE = "production_code"
    ARCHITECTURAL_PLANNING = "architectural_planning"
    MULTIMODAL_VISION = "multimodal_vision"
    HIGH_ACCURACY = "high_accuracy"
    STREAM_THOUGHTS = "stream_thoughts"  # Supports thinking transparency


class Tier(Enum):
    """
    Model performance tiers for mode-based selection.

    - SPEED: Fast responses, shallow reasoning (good for Direct mode)
    - BALANCED: General purpose (good for Creative mode)
    - REASONING: Chain-of-thought, verification (good for Socratic mode)
    - THINKING: Extended reasoning with visible thoughts (good for Deep Dive mode)
    """

    SPEED = "speed"
    BALANCED = "balanced"
    REASONING = "reasoning"
    THINKING = "thinking"
