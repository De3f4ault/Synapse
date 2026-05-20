"""
Platform Schemas - Pydantic models for platform-level operations.

INVARIANT: These schemas match frontend EntityIdentity/LearningEntity exactly.
INVARIANT: All modules use these schemas for cross-module communication.

Enums (EntityType, ModuleId, etc.) live in app.schemas.common.enums.
"""

from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field

from app.schemas.common.enums import (
    EntityType,
    EntityCapability,
    ModuleId,
    EntityVisibility,
    ActionStatus,
)


# ============================================================================
# Entity Schemas
# ============================================================================


class EntityIdentity(BaseModel):
    """
    Lightweight reference to any entity.
    This is the minimal information needed to identify an entity.
    """

    id: int | str = Field(description="Entity ID")
    type: EntityType = Field(description="Entity type")
    source_module: ModuleId = Field(description="Module that owns this entity")

    class Config:
        json_schema_extra = {
            "example": {"id": 123, "type": "document", "source_module": "documents"}
        }


class EntitySearchResult(EntityIdentity):
    """
    Result from an entity search.
    Lightweight, for display in pickers/mentions.
    """

    title: str = Field(description="Display title")
    created_at: Optional[datetime] = Field(default=None, description="Creation timestamp")
    match_preview: Optional[str] = Field(default=None, description="Context snippet")


class ResolvedCapability(BaseModel):
    """
    A capability with its runtime availability status.
    """

    capability: EntityCapability = Field(description="The capability")
    available: bool = Field(description="Whether capability is currently available")
    reason: Optional[str] = Field(default=None, description="Reason if not available")


class LearningEntity(EntityIdentity):
    """
    Full entity with resolved capabilities.
    This is the canonical entity contract.
    """

    title: Optional[str] = Field(default=None, description="Entity title")
    created_at: datetime = Field(description="Creation timestamp")
    capabilities: list[ResolvedCapability] = Field(
        default_factory=list, description="Resolved capabilities"
    )
    visibility: EntityVisibility = Field(
        default=EntityVisibility.PRIVATE, description="Visibility level"
    )
    metadata: Optional[dict[str, Any]] = Field(default=None, description="Type-specific metadata")

    class Config:
        json_schema_extra = {
            "example": {
                "id": 123,
                "type": "document",
                "source_module": "documents",
                "title": "Neural Networks Notes",
                "created_at": "2026-01-01T12:00:00Z",
                "capabilities": [
                    {"capability": "GENERATE_FLASHCARDS", "available": True},
                    {
                        "capability": "GENERATE_QUIZ",
                        "available": False,
                        "reason": "Document too short",
                    },
                ],
                "visibility": "private",
                "metadata": {"word_count": 1420, "page_count": 5},
            }
        }


# ============================================================================
# Graph Schemas
# ============================================================================


class PlatformAction(BaseModel):
    """
    A recommended action from graph intelligence.
    """

    type: EntityCapability = Field(description="Action type")
    target: EntityIdentity = Field(description="Target entity")
    reason: str = Field(description="Why this action is recommended")
    priority: int = Field(default=50, ge=0, le=100, description="Priority 0-100")


class GraphContext(BaseModel):
    """
    Intelligence context from the knowledge graph.
    """

    weaknesses: list[str] = Field(
        default_factory=list, description="Concept IDs with weakness edges"
    )
    strengths: list[str] = Field(default_factory=list, description="Concept IDs with mastery edges")
    recommended_actions: list[PlatformAction] = Field(
        default_factory=list, description="Platform-recommended actions"
    )


# ============================================================================
# Intelligence / Belief Model Schemas (GIE v1)
# ============================================================================


class WeaknessEvidence(BaseModel):
    """
    Structured evidence explaining why a concept is weak.
    """

    source: str = Field(description="Evidence source: quiz, flashcard, note, decay")
    reference_id: Optional[str] = Field(default=None, description="ID of source entity")
    reason: str = Field(description="Human-readable explanation")


class ConceptState(BaseModel):
    """
    Belief state for a concept in the knowledge graph.

    Belief Update Contract (v1):
    - mastery: derived from calculate_mastery.sql (accuracy * confidence * completion)
    - stability: +0.1 on correct reinforcement, decays 0.05/day without review
    - volatility: stddev of recent 10 review outcomes (0 = consistent, 1 = erratic)
    - evidence: appended on failure events, cleared on mastery > 0.7
    """

    concept_id: str = Field(description="Concept identifier (internal ID)")
    concept_name: Optional[str] = Field(default=None, description="Human-readable concept name")
    mastery: float = Field(ge=0.0, le=1.0, description="Current mastery level 0-1")
    stability: float = Field(ge=0.0, le=1.0, description="Memory strength / decay resistance")
    volatility: float = Field(
        ge=0.0, le=1.0, description="Performance variance (0=stable, 1=erratic)"
    )
    last_reinforced_at: Optional[datetime] = Field(
        default=None, description="Last reinforcement timestamp"
    )
    weakness_evidence: list[WeaknessEvidence] = Field(
        default_factory=list, description="Evidence for weakness"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "concept_id": "tcp_handshake",
                "mastery": 0.35,
                "stability": 0.6,
                "volatility": 0.4,
                "last_reinforced_at": "2026-01-05T10:00:00Z",
                "weakness_evidence": [
                    {
                        "source": "quiz",
                        "reference_id": "42",
                        "reason": "Incorrect answer on 3-way handshake question",
                    }
                ],
            }
        }


class AssistantContext(BaseModel):
    """
    Intelligence context for assistant system prompt injection.
    """

    weak_concepts: list[ConceptState] = Field(
        default_factory=list, description="Concepts needing attention"
    )
    pending_actions: list[PlatformAction] = Field(
        default_factory=list, description="Recommended platform actions"
    )
    session_focus: Optional[str] = Field(default=None, description="Current study focus topic")
    explanation: str = Field(description="Human-readable narrative for prompt injection")

    class Config:
        json_schema_extra = {
            "example": {
                "weak_concepts": [],
                "pending_actions": [],
                "session_focus": "networking",
                "explanation": "You've been struggling with TCP handshake concepts based on recent quiz attempts.",
            }
        }


class EntityRelation(BaseModel):
    """
    A relation between entities.
    """

    entity: EntityIdentity = Field(description="Related entity")
    relation_type: str = Field(description="Type of relation")
    weight: float = Field(default=1.0, description="Relation strength 0-1")


# ============================================================================
# Action Schemas
# ============================================================================


class GraphEffect(BaseModel):
    """
    Effect on the knowledge graph from an action.
    """

    type: str = Field(description="Effect type")
    node_id: Optional[str] = Field(default=None, description="Affected node ID")
    edge_id: Optional[str] = Field(default=None, description="Affected edge ID")
    description: Optional[str] = Field(default=None, description="Description")


class ActionError(BaseModel):
    """
    Error details for a failed action.
    """

    code: str = Field(description="Error code")
    message: str = Field(description="Error message")
    recoverable: bool = Field(default=True, description="Can the action be retried")


class PlatformActionResult(BaseModel):
    """
    Standard result from any platform-level action.
    """

    status: ActionStatus = Field(description="Action status")
    message: Optional[str] = Field(default=None, description="Human-readable message")
    created_entities: Optional[list[EntityIdentity]] = Field(
        default=None, description="Entities created by this action"
    )
    graph_effects: Optional[list[GraphEffect]] = Field(
        default=None, description="Effects on the knowledge graph"
    )
    error: Optional[ActionError] = Field(
        default=None, description="Error details if status is error"
    )


class ActionRequest(BaseModel):
    """
    Request to execute a capability on an entity.
    """

    action: EntityCapability = Field(description="Capability to execute")
    target: EntityIdentity = Field(description="Target entity")
    options: Optional[dict[str, Any]] = Field(default=None, description="Action-specific options")

    class Config:
        json_schema_extra = {
            "example": {
                "action": "GENERATE_FLASHCARDS",
                "target": {"id": 123, "type": "document", "source_module": "documents"},
                "options": {"count": 10, "difficulty": "medium"},
            }
        }
