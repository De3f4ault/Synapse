from sqlalchemy import Column, String, Float, DateTime, Integer, JSON
from app.db.base import Base


class IntelligenceAdaptationLog(Base):
    """
    Immutable log of qualified intelligence signals.

    This table records every time the system decided to learn something.
    It is the source of truth for:
    - Mastery updates (GIE)
    - Search weight tuning (RAG/Hybrid)
    - Rollback operations
    """

    __tablename__ = "intelligence_adaptation_log"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, nullable=False)

    # Event Context
    source_event_id = Column(String, index=True, nullable=False)
    surface = Column(String, nullable=False)  # chat, cmkd, dashboard

    # Entity Context
    entity_id = Column(String, index=True, nullable=False)
    entity_type = Column(String, nullable=False)  # chunk, concept, query

    # Intelligence Signal
    signal_type = Column(String, nullable=False)  # evidence_trusted, concept_reinforced
    learning_value = Column(Float, nullable=False)  # signed magnitude
    confidence_weight = Column(Float, nullable=False)  # 0.0-1.0

    # Applied Actions (JSON for flexibility)
    # e.g. {"mastery_delta": 0.05, "rank_boost": 1.2}
    applied_actions = Column(JSON, nullable=True)
