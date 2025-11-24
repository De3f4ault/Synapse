"""
Context Engine Module

The SYNAPSE BRAIN - aggregates user learning context from all modules.
"""

from .engine import ContextEngine
from .schemas import (
    ContextRequest,
    ContextResponse,
    WeakArea,
    MasteryScore,
)

__all__ = [
    "ContextEngine",
    "ContextRequest",
    "ContextResponse",
    "WeakArea",
    "MasteryScore",
]
