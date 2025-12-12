"""
Context Engine Schemas

Pydantic models for context requests and responses.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class WeakArea(BaseModel):
    """Represents a topic where the user needs improvement"""
    topic: str = Field(..., description="Topic identifier")
    module: str = Field(..., description="Module this topic belongs to")
    weakness_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Weakness score (0=strong, 1=very weak)"
    )
    evidence: Dict[str, Any] = Field(
        default_factory=dict,
        description="Evidence supporting this weakness (review data, etc.)"
    )


class MasteryScore(BaseModel):
    """Represents mastery level for a topic"""
    topic: str = Field(..., description="Topic identifier")
    score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Mastery score (0=no mastery, 1=complete mastery)"
    )
    review_count: int = Field(
        ...,
        ge=0,
        description="Number of reviews for this topic"
    )


class ContextRequest(BaseModel):
    """Request for user context"""
    user_id: int = Field(..., description="User ID")
    focus: Optional[str] = Field(
        None,
        description="Optional focus topic to prioritize"
    )
    modules: Optional[List[str]] = Field(
        None,
        description="Specific modules to include (if None, include all)"
    )


class ContextResponse(BaseModel):
    """Complete user learning context"""
    user_id: int = Field(..., description="User ID")

    # Module-specific context
    modules: Dict[str, Dict[str, Any]] = Field(
        default_factory=dict,
        description="Context from each learning module"
    )

    # Analytics
    analytics: Dict[str, Any] = Field(
        default_factory=dict,
        description="Aggregated analytics and insights"
    )

    # Metadata
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Metadata about context generation"
    )

    generated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="When this context was generated"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 1,
                "modules": {
                    "flashcards": {
                        "due_count": 15,
                        "weak_topics": ["biology", "chemistry"]
                    },
                    "notes": {
                        "recent_notes": 5
                    }
                },
                "analytics": {
                    "weak_topics": [
                        {
                            "topic": "biology",
                            "module": "flashcards",
                            "weakness_score": 0.7
                        }
                    ],
                    "mastery_scores": [
                        {
                            "topic": "mathematics",
                            "score": 0.85,
                            "review_count": 42
                        }
                    ]
                },
                "metadata": {
                    "cached": False,
                    "generation_time_ms": 123
                },
                "generated_at": "2025-11-20T12:00:00Z"
            }
        }
