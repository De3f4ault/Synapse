"""
Grounding Service - Evidence retrieval and formatting for LLM grounding.

This module provides the grounding middleware that bridges the Search Intelligence Bus
and Agent execution. It is the ONLY path for evidence to reach the LLM.

Exports:
    - GroundingService: Main service for grounding
    - GroundingResult: Result of grounding operation
    - EvidenceChunk: Individual evidence piece
    - EvidenceUsage: Feedback signal for GIE
    - get_grounding_service: Factory function
    - format_evidence_for_prompt: Deterministic formatting
    - GROUNDING_SYSTEM_PROMPT: Immutable system prompt
"""

from app.services.grounding.grounding_service import (
    GroundingService,
    get_grounding_service,
    format_evidence_for_prompt,
    format_grounded_prompt,
    select_evidence,
    create_evidence_usage_signal,
    GROUNDING_SYSTEM_PROMPT,
    GROUNDING_INSTRUCTION,
)

from app.schemas.intelligence import (
    GroundingResult,
    EvidenceChunk,
    EvidenceUsage,
    ConfidenceLevel,
)

__all__ = [
    # Service
    "GroundingService",
    "get_grounding_service",
    # Schemas
    "GroundingResult",
    "EvidenceChunk",
    "EvidenceUsage",
    "ConfidenceLevel",
    # Functions
    "format_evidence_for_prompt",
    "format_grounded_prompt",
    "select_evidence",
    "create_evidence_usage_signal",
    # Constants
    "GROUNDING_SYSTEM_PROMPT",
    "GROUNDING_INSTRUCTION",
]
