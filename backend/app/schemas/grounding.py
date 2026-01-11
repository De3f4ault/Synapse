"""
Grounding Schemas - Evidence structures for LLM grounding.

These schemas represent evidence retrieved from the Search Intelligence Bus
and formatted for LLM prompt injection.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class ConfidenceLevel(str, Enum):
    """Evidence confidence classification."""

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    NONE = "none"


class EvidenceChunk(BaseModel):
    """
    A single evidence chunk for LLM grounding.

    Only what the LLM needs to reason about credibility.
    No raw scores, no ranking details.
    """

    id: str = Field(..., description="Unique chunk identifier")
    title: str = Field(..., description="Source document title")
    snippet: str = Field(..., description="The actual content")
    parent_id: Optional[str] = Field(None, description="Parent document ID")
    root_id: Optional[str] = Field(None, description="Root document ID")
    confidence: float = Field(0.5, ge=0.0, le=1.0, description="Confidence 0-1")
    similarity: float = Field(0.0, ge=0.0, le=1.0, description="Vector similarity")

    @property
    def confidence_level(self) -> ConfidenceLevel:
        """Categorize confidence for display."""
        if self.confidence >= 0.8:
            return ConfidenceLevel.HIGH
        elif self.confidence >= 0.5:
            return ConfidenceLevel.MEDIUM
        else:
            return ConfidenceLevel.LOW


class EvidenceUsage(BaseModel):
    """
    Signal emitted when Chat uses evidence.
    This is the ONLY feedback signal from Chat → GIE.

    Used for:
    - Tracking which evidence was available vs used
    - Correlating answer quality with grounding
    - GIE mastery updates (Phase 3)
    """

    available_evidence_ids: List[str] = Field(
        default_factory=list, description="IDs of evidence chunks that were available"
    )
    used_evidence_ids: List[str] = Field(
        default_factory=list, description="IDs of evidence chunks actually used (cited)"
    )
    avg_confidence: float = Field(0.0, description="Average confidence of available evidence")
    is_grounded: bool = Field(False, description="Whether response is grounded")
    answer_quality_proxy: Optional[str] = Field(
        None, description="Quality proxy: positive, negative, neutral"
    )
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class GroundingResult(BaseModel):
    """
    Result of the grounding process.

    Contains:
    - Selected evidence chunks
    - Formatted prompt block for LLM injection
    - Evidence usage signal for feedback tracking
    """

    evidence: List[EvidenceChunk] = Field(
        default_factory=list, description="Selected evidence chunks"
    )
    formatted_prompt_block: str = Field(
        "", description="Formatted evidence block for prompt injection"
    )
    evidence_usage: EvidenceUsage = Field(
        default_factory=EvidenceUsage, description="Evidence usage signal"
    )
    grounding_latency_ms: Optional[float] = Field(
        None, description="Time taken to retrieve and format evidence"
    )

    @property
    def has_grounding(self) -> bool:
        """Whether grounding was successful."""
        return len(self.evidence) > 0

    @property
    def source_count(self) -> int:
        """Number of sources used."""
        return len(self.evidence)

    @property
    def avg_confidence(self) -> float:
        """Average confidence across evidence."""
        if not self.evidence:
            return 0.0
        return sum(e.confidence for e in self.evidence) / len(self.evidence)

    @property
    def confidence_level(self) -> ConfidenceLevel:
        """Overall confidence level."""
        if not self.evidence:
            return ConfidenceLevel.NONE
        avg = self.avg_confidence
        if avg >= 0.8:
            return ConfidenceLevel.HIGH
        elif avg >= 0.5:
            return ConfidenceLevel.MEDIUM
        else:
            return ConfidenceLevel.LOW
