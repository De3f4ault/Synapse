"""
Quiz schemas — single source of truth for all quiz-related API contracts.
"""

from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


# ============================================================================
# Question Schemas
# ============================================================================


class QuestionCreate(BaseModel):
    """Question creation schema."""

    question_text: str
    question_type: str  # multiple_choice, short_answer, true_false
    options: Optional[dict] = None
    correct_answer: str
    explanation: Optional[str] = None
    points: int = 1


class QuestionResponse(BaseModel):
    """Question response with answers for learning mode."""

    id: int
    question_text: str
    question_type: str
    options: Optional[dict]
    points: int
    order: int
    correct_answer: str
    explanation: Optional[str] = None


# ============================================================================
# Quiz Schemas
# ============================================================================


class QuizCreate(BaseModel):
    """Quiz creation schema."""

    title: str = Field(..., max_length=500)
    description: Optional[str] = None
    difficulty: str = "medium"  # easy, medium, hard
    time_limit_minutes: Optional[int] = Field(None, gt=0)
    questions: List[QuestionCreate]


class QuizResponse(BaseModel):
    """Quiz response."""

    id: int
    title: str
    description: Optional[str]
    difficulty: str
    time_limit_minutes: Optional[int]
    question_count: int
    user_id: int
    created_at: datetime


# ============================================================================
# Attempt Schemas
# ============================================================================


class AnswerSubmit(BaseModel):
    """Answer submission with per-question timing."""

    question_id: int
    answer: str
    duration_ms: Optional[int] = None


class QuizAttemptStart(BaseModel):
    """Quiz attempt start response."""

    attempt_id: int
    quiz_id: int
    started_at: datetime
    questions: List[QuestionResponse]


class AnswerResult(BaseModel):
    """Individual answer result."""

    question_id: int
    question_text: str
    your_answer: str
    correct_answer: str
    is_correct: bool
    explanation: Optional[str]
    points_earned: int


class QuizResultResponse(BaseModel):
    """Quiz result response."""

    attempt_id: int
    score: Decimal
    max_score: int
    percentage: float
    time_taken_seconds: int
    answers: List[AnswerResult]


class PartialAnswer(BaseModel):
    """A saved partial answer during an attempt."""

    question_id: int
    answer: str


class QuizAttemptResume(BaseModel):
    """Response for resuming an in-progress attempt."""

    attempt_id: int
    quiz_id: int
    started_at: datetime
    time_limit_minutes: Optional[int]
    elapsed_seconds: int
    current_question_index: int
    questions: List[QuestionResponse]
    partial_answers: List[PartialAnswer]
    is_expired: bool


# ============================================================================
# Generation Schemas
# ============================================================================


class QuizGenerateRequest(BaseModel):
    """AI quiz generation request."""

    topic: str = Field(..., min_length=3, max_length=500, description="Topic")
    document_id: Optional[int] = Field(None, description="Document to base quiz on")
    num_questions: int = Field(10, ge=5, le=30, description="Number of questions")
    difficulty: str = Field("medium", description="Difficulty: easy, medium, hard")


class QuizGenerateResponse(BaseModel):
    """AI quiz generation response."""

    quiz_id: int
    title: str
    description: Optional[str]
    difficulty: str
    question_count: int
    status: str
    message: str


# ============================================================================
# SM-2 / Due Questions
# ============================================================================


class DueQuestionResponse(BaseModel):
    """Due question for SM-2 review."""

    question_id: int
    question_text: str
    question_type: str
    options: Optional[dict]
    quiz_id: int
    quiz_title: str
    interval_days: int
    ease_factor: float
    repetitions: int
    last_reviewed_at: Optional[datetime]
    learning_state: str


class DueQuestionsResponse(BaseModel):
    """Response for due questions endpoint."""

    questions: List[DueQuestionResponse]
    total_due: int


# ============================================================================
# Insights & Cross-Module Schemas
# ============================================================================


class QuizInsightsResponse(BaseModel):
    """AI-generated insights for a quiz attempt."""

    attempt_id: int
    summary: str
    weak_areas: List[str]
    recommendations: List[str]
    generated_at: datetime


class RelatedFlashcardResponse(BaseModel):
    """Related flashcard surfaced via semantic neighborhood."""

    id: int
    front_text: str
    similarity: float
    evidence_strength: str
    last_quality: Optional[int] = None
    days_since_review: Optional[int] = None


class RelatedFlashcardsResponse(BaseModel):
    """Response for related flashcards endpoint."""

    flashcards: List[RelatedFlashcardResponse]
    advisory_message: str


class ContextNoteResponse(BaseModel):
    """Note surfaced as context for weak areas."""

    id: int
    title: str
    similarity: float


class ContextForWeaknessResponse(BaseModel):
    """Response for context-for-weakness endpoint."""

    notes: List[ContextNoteResponse]
    advisory_message: str
