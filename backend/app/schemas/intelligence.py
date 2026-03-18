from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime
from app.schemas.search_identity import SearchEntityIdentity


class QualifiedSignal(BaseModel):
    """
    A promoted, trusted signal ready to influence system intelligence.

    Derived from raw FeedbackEvents after passing the Promotion Gates.
    Unlike raw feedback, this signal asserts UTILITY and TRUST.
    """

    entity_id: SearchEntityIdentity
    signal_type: Literal[
        "evidence_trusted",  # Used in a good answer (Pos)
        "evidence_rejected",  # Explicitly rejected/ignored (Neg)
        "concept_reinforced",  # Mastery interaction (Pos)
        "concept_confused",  # Clarification needed (Neg)
    ]
    confidence_weight: float  # 0.0 to 1.0 (How much we trust this signal)
    learning_value: float  # -1.0 to +1.0 (Direction and magnitude of update)
    source: Literal["chat", "cmdk", "dashboard"]
    timestamp: datetime


class IntelligenceSummary(BaseModel):
    """Intelligence summary response."""

    weak_concepts: list = Field(default_factory=list, description="Concepts with mastery < 0.3")
    fragile_concepts: list = Field(default_factory=list, description="Concepts at risk of decay")
    high_roi_concepts: list = Field(default_factory=list, description="Concepts with high reinforcement ROI")
    recommended_actions: list = Field(default_factory=list, description="Recommended platform actions")
    generated_at: datetime = Field(default_factory=datetime.utcnow)

