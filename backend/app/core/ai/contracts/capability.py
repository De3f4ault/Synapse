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
