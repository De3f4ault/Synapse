"""
Context schemas for SYNAPSE Context Engine.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class WeakArea(BaseModel):
    """Weak area schema."""

    topic: str = Field(description="Topic name")
    module: str = Field(description="Module name (flashcards, notes, etc.)")
    weakness_score: float = Field(ge=0.0, le=1.0, description="Weakness score (0.0=strong, 1.0=weak)")
    evidence: List[str] = Field(description="Evidence for weakness")
    recommendation: Optional[str] = Field(default=None, description="Recommendation for improvement")

    class Config:
        json_schema_extra = {
            "example": {
                "topic": "Cellular Respiration",
                "module": "flashcards",
                "weakness_score": 0.35,
                "evidence": [
                    "Low accuracy (55%) on last 10 reviews",
                    "Average response time 12s (above average)",
                    "3 consecutive incorrect answers"
                ],
                "recommendation": "Focus on electron transport chain concepts"
            }
        }


class MasteryScore(BaseModel):
    """Mastery score schema."""

    topic: str = Field(description="Topic name")
    score: float = Field(ge=0.0, le=1.0, description="Mastery score (0.0=novice, 1.0=mastered)")
    review_count: int = Field(description="Number of reviews")
    trend: Optional[str] = Field(default=None, pattern="^(improving|stable|declining)$", description="Learning trend")

    class Config:
        json_schema_extra = {
            "example": {
                "topic": "Photosynthesis",
                "score": 0.85,
                "review_count": 25,
                "trend": "improving"
            }
        }


class RecentActivity(BaseModel):
    """Recent activity schema."""

    module: str = Field(description="Module name")
    activity_type: str = Field(description="Activity type (review, study, read)")
    content_id: int = Field(description="Content ID")
    content_title: str = Field(description="Content title")
    timestamp: datetime = Field(description="Activity timestamp")
    outcome: Optional[Dict[str, Any]] = Field(default=None, description="Activity outcome")

    class Config:
        json_schema_extra = {
            "example": {
                "module": "flashcards",
                "activity_type": "review",
                "content_id": 1,
                "content_title": "Cell Structure",
                "timestamp": "2025-11-06T12:00:00Z",
                "outcome": {
                    "quality": 4,
                    "correct": True
                }
            }
        }


class ModuleContext(BaseModel):
    """Per-module context schema."""

    module: str = Field(description="Module name")
    relevant_content: List[Dict[str, Any]] = Field(description="Relevant content from module")
    statistics: Dict[str, Any] = Field(description="Module-specific statistics")
    weak_areas: List[str] = Field(default_factory=list, description="Weak areas in this module")

    class Config:
        json_schema_extra = {
            "example": {
                "module": "flashcards",
                "relevant_content": [
                    {
                        "id": 1,
                        "front": "What is photosynthesis?",
                        "back": "Process converting light to energy",
                        "next_review": "2025-11-07T10:00:00Z"
                    }
                ],
                "statistics": {
                    "total_cards": 50,
                    "due_cards": 12,
                    "accuracy": 0.82
                },
                "weak_areas": ["Cellular Respiration", "DNA Replication"]
            }
        }


class ContextRequest(BaseModel):
    """Context request schema."""

    user_id: int = Field(description="User ID")
    focus: Optional[str] = Field(default=None, description="Focus area (topic or module)")
    modules: List[str] = Field(default_factory=list, description="Specific modules to include")
    max_tokens: int = Field(default=8000, ge=1000, le=20000, description="Maximum context tokens")
    include_weak_areas: bool = Field(default=True, description="Include weak area analysis")
    include_recent_activity: bool = Field(default=True, description="Include recent activity")

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 1,
                "focus": "biology",
                "modules": ["flashcards", "notes"],
                "max_tokens": 8000,
                "include_weak_areas": True,
                "include_recent_activity": True
            }
        }


class ContextResponse(BaseModel):
    """Context response schema."""

    user_id: int = Field(description="User ID")
    modules: List[ModuleContext] = Field(description="Per-module context")
    analytics: Dict[str, Any] = Field(description="Overall analytics")
    weak_areas: List[WeakArea] = Field(description="Identified weak areas")
    mastery_scores: List[MasteryScore] = Field(description="Mastery scores by topic")
    recent_activity: List[RecentActivity] = Field(description="Recent learning activity")
    metadata: Dict[str, Any] = Field(description="Context metadata")

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 1,
                "modules": [
                    {
                        "module": "flashcards",
                        "relevant_content": [...],
                        "statistics": {
                            "total_cards": 50,
                            "due_cards": 12
                        },
                        "weak_areas": ["Cellular Respiration"]
                    }
                ],
                "analytics": {
                    "study_streak": 7,
                    "total_study_time": 18000,
                    "overall_accuracy": 0.82
                },
                "weak_areas": [
                    {
                        "topic": "Cellular Respiration",
                        "module": "flashcards",
                        "weakness_score": 0.35,
                        "evidence": ["Low accuracy on recent reviews"]
                    }
                ],
                "mastery_scores": [
                    {
                        "topic": "Photosynthesis",
                        "score": 0.85,
                        "review_count": 25,
                        "trend": "improving"
                    }
                ],
                "recent_activity": [
                    {
                        "module": "flashcards",
                        "activity_type": "review",
                        "content_id": 1,
                        "content_title": "Cell Structure",
                        "timestamp": "2025-11-06T12:00:00Z"
                    }
                ],
                "metadata": {
                    "generated_at": "2025-11-06T12:00:00Z",
                    "cached": False,
                    "tokens_used": 7500,
                    "focus": "biology"
                }
            }
        }


class ContextInvalidationRequest(BaseModel):
    """Context invalidation request schema."""

    user_id: int = Field(description="User ID")
    modules: Optional[List[str]] = Field(default=None, description="Specific modules to invalidate (None=all)")

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 1,
                "modules": ["flashcards"]
            }
        }
