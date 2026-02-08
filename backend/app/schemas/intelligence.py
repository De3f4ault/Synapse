from pydantic import BaseModel
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
