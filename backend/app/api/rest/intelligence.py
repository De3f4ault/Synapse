"""
Intelligence API.

Provides Graph Intelligence Engine (GIE) endpoints.

Endpoints:
  GET /intelligence/summary - Get user intelligence summary
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.platform import (
    ConceptState,
    WeaknessEvidence,
    AssistantContext,
    PlatformAction,
    EntityCapability,
    EntityIdentity,
    ModuleId,
    EntityType,
)
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


router = APIRouter()


# ============================================================================
# Response Models
# ============================================================================


class IntelligenceSummary(BaseModel):
    """Intelligence summary response."""

    weak_concepts: list[ConceptState] = Field(
        default_factory=list, description="Concepts with mastery < 0.3"
    )
    fragile_concepts: list[ConceptState] = Field(
        default_factory=list, description="Concepts at risk of decay"
    )
    high_roi_concepts: list[ConceptState] = Field(
        default_factory=list, description="Concepts with high reinforcement ROI"
    )
    recommended_actions: list[PlatformAction] = Field(
        default_factory=list, description="Recommended platform actions"
    )
    generated_at: datetime = Field(default_factory=datetime.utcnow)


# ============================================================================
# Endpoints
# ============================================================================


@router.get(
    "/summary",
    response_model=IntelligenceSummary,
    summary="Get Intelligence Summary",
    description="Get weak concepts, fragile concepts, and recommended actions for the user.",
)
async def get_intelligence_summary(
    limit: int = 5,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> IntelligenceSummary:
    """
    Get intelligence summary for the current user.

    This is the primary GIE endpoint that powers:
    - Study Hub recommendations
    - Assistant context injection
    - Dashboard weak areas
    """

    # Query the SQL function
    result = await db.execute(
        text("SELECT * FROM developer_schema.get_intelligence_summary(:user_id, :limit)"),
        {"user_id": current_user.id, "limit": limit},
    )
    rows = result.fetchall()

    weak_concepts: list[ConceptState] = []
    fragile_concepts: list[ConceptState] = []
    high_roi_concepts: list[ConceptState] = []

    for row in rows:
        # Parse evidence from JSONB
        evidence_list = []
        if row.weakness_evidence:
            for ev in row.weakness_evidence:
                evidence_list.append(
                    WeaknessEvidence(
                        source=ev.get("source", "unknown"),
                        reference_id=ev.get("reference_id"),
                        reason=ev.get("reason", ""),
                    )
                )

        concept = ConceptState(
            concept_id=str(row.concept_id),
            concept_name=row.concept_name,
            mastery=float(row.mastery or 0),
            stability=float(row.stability or 0.5),
            volatility=float(row.volatility or 0.5),
            last_reinforced_at=row.last_reinforced_at,
            weakness_evidence=evidence_list,
        )

        if row.category == "weak":
            weak_concepts.append(concept)
        elif row.category == "fragile":
            fragile_concepts.append(concept)
        elif row.category == "high_roi":
            high_roi_concepts.append(concept)

    # Generate recommended actions from concepts
    recommended_actions = _generate_actions(weak_concepts, fragile_concepts, current_user.id)

    return IntelligenceSummary(
        weak_concepts=weak_concepts,
        fragile_concepts=fragile_concepts,
        high_roi_concepts=high_roi_concepts,
        recommended_actions=recommended_actions,
        generated_at=datetime.utcnow(),
    )


@router.get(
    "/context",
    response_model=AssistantContext,
    summary="Get Assistant Context",
    description="Get intelligence context formatted for assistant system prompt injection.",
)
async def get_assistant_context(
    session_focus: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AssistantContext:
    """
    Get context for assistant prompt injection.

    This returns a pre-formatted context with explanation narrative.
    """

    # Get intelligence summary
    summary = await get_intelligence_summary(limit=3, db=db, current_user=current_user)

    # Generate explanation narrative
    explanation = _generate_explanation(
        summary.weak_concepts, summary.fragile_concepts, session_focus
    )

    return AssistantContext(
        weak_concepts=summary.weak_concepts[:3],
        pending_actions=summary.recommended_actions[:3],
        session_focus=session_focus,
        explanation=explanation,
    )


# ============================================================================
# Internal Helpers
# ============================================================================


def _generate_actions(
    weak: list[ConceptState], fragile: list[ConceptState], user_id: int
) -> list[PlatformAction]:
    """Generate platform actions from concept states."""
    actions: list[PlatformAction] = []

    # Weak concepts → Review flashcards
    for concept in weak[:3]:
        actions.append(
            PlatformAction(
                type=EntityCapability.REINFORCE_GRAPH,
                target=EntityIdentity(
                    id=concept.concept_id,
                    type=EntityType.CONCEPT,
                    source_module=ModuleId.FLASHCARDS,
                ),
                reason=f"Low mastery ({concept.mastery:.0%}) on this topic based on recent reviews",
                priority=80,
            )
        )

    # Fragile concepts → Generate more flashcards
    for concept in fragile[:2]:
        actions.append(
            PlatformAction(
                type=EntityCapability.GENERATE_FLASHCARDS,
                target=EntityIdentity(
                    id=concept.concept_id, type=EntityType.CONCEPT, source_module=ModuleId.NOTES
                ),
                reason=f"Concept is fragile (stability: {concept.stability:.0%}) due to gaps between reviews",
                priority=60,
            )
        )

    return actions


def _generate_explanation(
    weak: list[ConceptState], fragile: list[ConceptState], focus: Optional[str]
) -> str:
    """Generate human-readable explanation for assistant prompt."""

    parts: list[str] = []

    if focus:
        parts.append(f"The user is currently focused on: {focus}.")

    if weak:
        names = ", ".join([c.concept_id for c in weak[:3]])
        parts.append(f"Areas needing attention: {names}.")

    if fragile:
        names = ", ".join([c.concept_id for c in fragile[:2]])
        parts.append(f"Concepts at risk of being forgotten: {names}.")

    if not parts:
        return "No immediate learning concerns detected."

    return " ".join(parts)
