"""
Platform Schemas - Pydantic models for platform-level operations.

INVARIANT: These schemas match frontend EntityIdentity/LearningEntity exactly.
INVARIANT: All modules use these schemas for cross-module communication.
"""

from datetime import datetime
from typing import Any, Optional
from enum import Enum
from pydantic import BaseModel, Field


# ============================================================================
# Enums
# ============================================================================


class EntityType(str, Enum):
    """
    Canonical entity types across the platform.
    Must match frontend EntityType exactly.
    """

    DOCUMENT = "document"
    NOTE = "note"
    FLASHCARD = "flashcard"
    QUIZ = "quiz"
    CONCEPT = "concept"


class EntityCapability(str, Enum):
    """
    Actions that can be performed on entities.
    Must match frontend EntityCapability exactly.
    """

    REFERENCE_IN_CHAT = "REFERENCE_IN_CHAT"
    GENERATE_FLASHCARDS = "GENERATE_FLASHCARDS"
    GENERATE_QUIZ = "GENERATE_QUIZ"
    REINFORCE_GRAPH = "REINFORCE_GRAPH"
    EXPORT = "EXPORT"
    SUMMARIZE = "SUMMARIZE"


class ModuleId(str, Enum):
    """
    Registered module identifiers.
    Must match frontend ModuleId exactly.
    """

    NOTES = "notes"
    DOCUMENTS = "documents"
    FLASHCARDS = "flashcards"
    QUIZZES = "quizzes"
    CHAT = "chat"
    GRAPH = "graph"


class EntityVisibility(str, Enum):
    """Entity visibility levels."""

    PRIVATE = "private"
    WORKSPACE = "workspace"
    GLOBAL = "global"


class ActionStatus(str, Enum):
    """Status of a platform action."""

    SUCCESS = "success"
    ERROR = "error"
    CANCELLED = "cancelled"
    PENDING = "pending"


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
