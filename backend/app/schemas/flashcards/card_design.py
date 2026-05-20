"""
AI Card Designer Schemas.

Defines the plan structure that flows from the design conversation
through to the card generation pipeline.
"""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class CardStyle(str, Enum):
    """
    Card style as chosen by the AI designer during conversation.

    Maps 1:1 to the card_type column in the flashcards table (String, no enum
    constraint). Socratic and scenario are stored as first-class values so the
    Card Tutor and analytics layer can read the intended cognitive style.

    BASIC    → standard Q/A flip card
    CLOZE    → fill-in-the-blank; front uses __ marker; cloze_answer is set
    SOCRATIC → reasoning-oriented ("What would happen if X?")
    SCENARIO → situation-based ("You are in situation X — what do you do?")
    """

    BASIC = "basic"
    CLOZE = "cloze"
    SOCRATIC = "socratic"
    SCENARIO = "scenario"


class SubtopicSpec(BaseModel):
    """A single subtopic block within a card plan."""

    topic: str = Field(..., description="Noun-phrase label, e.g. 'Spanish Subjunctive'")
    count: int = Field(..., ge=1, le=50, description="Number of cards for this subtopic")
    style: CardStyle = Field(CardStyle.BASIC, description="Card cognitive style")
    difficulty_note: str = Field(
        "", description="Free-text difficulty hint for the generation prompt"
    )


class CardDesignPlan(BaseModel):
    """
    Structured plan produced by the AI designer during the conversation.

    The AI emits this as a tool call (propose_card_plan). The frontend
    parses it from the SSE stream and renders the proposal panel. When the
    user accepts, this is sent to POST /ai/design/generate.
    """

    deck_name: str = Field(..., description="Name for the deck to create or add to")
    deck_id: Optional[int] = Field(
        None, description="Existing deck ID to add cards into; None = create new deck"
    )
    subtopics: list[SubtopicSpec] = Field(default_factory=list)
    total_cards: int = Field(..., ge=1, le=200)
    learning_objective: str = Field(
        "",
        description="'exam_recall' | 'conversational' | 'conceptual' | 'procedural'",
    )
    source_material: Optional[str] = Field(
        None, description="Pasted source text to ground generation"
    )
    rationale: str = Field("", description="AI's explanation of the plan")


class CardDesignSessionRequest(BaseModel):
    """Request body for POST /ai/design/session."""

    deck_id: Optional[int] = Field(None, description="Pre-selected deck to add cards into")


class CardDesignSessionResponse(BaseModel):
    """Response from POST /ai/design/session."""

    session_id: int
    deck_id: Optional[int] = None
    deck_name: Optional[str] = None
    is_resumed: bool = False


class CardDesignGenerateRequest(BaseModel):
    """Request body for POST /ai/design/generate."""

    plan: CardDesignPlan
    session_id: Optional[int] = Field(None, description="Design session for audit trail")


class DesignSessionSummary(BaseModel):
    """One entry in the GET /ai/design/sessions list."""

    session_id: int
    deck_id: Optional[int] = None
    deck_name: str
    card_count: int = 0
    last_message_preview: Optional[str] = None
    updated_at: str  # ISO-8601 string — avoids timezone serialisation issues

    class Config:
        from_attributes = True

