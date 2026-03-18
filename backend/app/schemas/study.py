"""
Study session schemas.

Extracted from rest/study.py.
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.study_session import StudySessionType


class StudyItemResponse(BaseModel):
    """Study item (flashcard, quiz, etc.)."""
    type: str
    id: int
    data: dict


class StudySessionCreate(BaseModel):
    """Study session creation."""
    session_type: StudySessionType
    modules: List[str] = Field(default_factory=lambda: ["flashcards", "quizzes"])


class StudySessionResponse(BaseModel):
    """Study session response."""
    id: int
    session_type: StudySessionType
    modules_used: List[str]
    items_completed: int
    items_correct: int
    accuracy: float
    time_spent_seconds: int
    started_at: datetime
    ended_at: Optional[datetime]
    is_completed: bool
