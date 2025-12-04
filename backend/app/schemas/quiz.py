"""
Quiz schemas.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# Question Schemas

class QuestionCreate(BaseModel):
    """Question creation schema."""

    question_text: str = Field(min_length=1, max_length=10000, description="Question text")
    question_type: str = Field(pattern="^(multiple_choice|true_false|short_answer)$", description="Question type")
    options: Optional[List[str]] = Field(default=None, description="Options (for multiple choice)")
    correct_answer: str = Field(min_length=1, max_length=1000, description="Correct answer")
    explanation: Optional[str] = Field(default=None, max_length=10000, description="Explanation")
    points: int = Field(default=1, ge=1, description="Points for correct answer")
    order: int = Field(default=0, ge=0, description="Question order in quiz")

    class Config:
        json_schema_extra = {
            "example": {
                "question_text": "What is the powerhouse of the cell?",
                "question_type": "multiple_choice",
                "options": ["Nucleus", "Mitochondria", "Ribosome", "Golgi apparatus"],
                "correct_answer": "Mitochondria",
                "explanation": "Mitochondria generate most of the cell's ATP through cellular respiration",
                "points": 1,
                "order": 0
            }
        }


class QuestionResponse(BaseModel):
    """Question response schema (without correct answer for active quizzes)."""

    id: int = Field(description="Question ID")
    question_text: str = Field(description="Question text")
    question_type: str = Field(description="Question type")
    options: Optional[List[str]] = Field(default=None, description="Options (for multiple choice)")
    points: int = Field(description="Points")
    order: int = Field(description="Question order")

    # Note: correct_answer and explanation excluded for security

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "question_text": "What is the powerhouse of the cell?",
                "question_type": "multiple_choice",
                "options": ["Nucleus", "Mitochondria", "Ribosome", "Golgi apparatus"],
                "points": 1,
                "order": 0
            }
        }


# Quiz Schemas

class QuizCreate(BaseModel):
    """Quiz creation schema."""

    title: str = Field(min_length=1, max_length=500, description="Quiz title")
    description: Optional[str] = Field(default=None, description="Quiz description")
    questions: List[QuestionCreate] = Field(min_length=1, description="Quiz questions")
    difficulty: str = Field(default="medium", pattern="^(easy|medium|hard)$", description="Difficulty level")
    time_limit_minutes: Optional[int] = Field(default=None, ge=1, description="Time limit in minutes")
    source_type: str = Field(default="manual", pattern="^(manual|ai_generated)$", description="Source type")
    source_ids: Optional[Dict[str, List[int]]] = Field(default=None, description="Source IDs (notes, documents)")

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Cell Biology Basics",
                "description": "Test your knowledge of cell structure and function",
                "questions": [
                    {
                        "question_text": "What is the powerhouse of the cell?",
                        "question_type": "multiple_choice",
                        "options": ["Nucleus", "Mitochondria", "Ribosome", "Golgi apparatus"],
                        "correct_answer": "Mitochondria",
                        "explanation": "Mitochondria generate ATP",
                        "points": 1,
                        "order": 0
                    }
                ],
                "difficulty": "medium",
                "time_limit_minutes": 30,
                "source_type": "manual",
                "source_ids": None
            }
        }


class QuizResponse(BaseModel):
    """Quiz response schema."""

    id: int = Field(description="Quiz ID")
    user_id: int = Field(description="Creator user ID")
    title: str = Field(description="Quiz title")
    description: Optional[str] = Field(default=None, description="Quiz description")
    question_count: int = Field(description="Number of questions")
    difficulty: str = Field(description="Difficulty level")
    time_limit_minutes: Optional[int] = Field(default=None, description="Time limit in minutes")
    source_type: str = Field(description="Source type")
    created_at: datetime = Field(description="Creation time")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "user_id": 1,
                "title": "Cell Biology Basics",
                "description": "Test your knowledge of cell structure and function",
                "question_count": 10,
                "difficulty": "medium",
                "time_limit_minutes": 30,
                "source_type": "manual",
                "created_at": "2025-11-01T10:00:00Z"
            }
        }


# Quiz Attempt Schemas

class QuizAttemptCreate(BaseModel):
    """Quiz attempt creation schema."""

    quiz_id: int = Field(description="Quiz ID")

    class Config:
        json_schema_extra = {
            "example": {
                "quiz_id": 1
            }
        }


class AnswerSubmit(BaseModel):
    """Answer submission schema."""

    question_id: int = Field(description="Question ID")
    answer: str = Field(min_length=1, max_length=10000, description="User's answer")

    class Config:
        json_schema_extra = {
            "example": {
                "question_id": 1,
                "answer": "Mitochondria"
            }
        }


class AnswerResult(BaseModel):
    """Answer result schema."""

    question_id: int = Field(description="Question ID")
    question_text: str = Field(description="Question text")
    your_answer: str = Field(description="User's answer")
    correct_answer: str = Field(description="Correct answer")
    is_correct: bool = Field(description="Whether answer was correct")
    explanation: Optional[str] = Field(default=None, description="Explanation")
    points: int = Field(description="Points for this question")
    points_earned: int = Field(description="Points earned")

    class Config:
        json_schema_extra = {
            "example": {
                "question_id": 1,
                "question_text": "What is the powerhouse of the cell?",
                "your_answer": "Mitochondria",
                "correct_answer": "Mitochondria",
                "is_correct": True,
                "explanation": "Mitochondria generate most of the cell's ATP",
                "points": 1,
                "points_earned": 1
            }
        }


class QuizResultResponse(BaseModel):
    """Quiz result response schema."""

    attempt_id: int = Field(description="Attempt ID")
    quiz_id: int = Field(description="Quiz ID")
    score: float = Field(description="Score earned")
    max_score: int = Field(description="Maximum possible score")
    percentage: float = Field(ge=0.0, le=100.0, description="Percentage score")
    answers: List[AnswerResult] = Field(description="Answer results")
    time_taken_seconds: Optional[int] = Field(default=None, description="Time taken in seconds")
    completed_at: datetime = Field(description="Completion time")

    class Config:
        json_schema_extra = {
            "example": {
                "attempt_id": 1,
                "quiz_id": 1,
                "score": 8.0,
                "max_score": 10,
                "percentage": 80.0,
                "answers": [
                    {
                        "question_id": 1,
                        "question_text": "What is the powerhouse of the cell?",
                        "your_answer": "Mitochondria",
                        "correct_answer": "Mitochondria",
                        "is_correct": True,
                        "explanation": "Mitochondria generate ATP",
                        "points": 1,
                        "points_earned": 1
                    }
                ],
                "time_taken_seconds": 1200,
                "completed_at": "2025-11-06T12:00:00Z"
            }
        }


class QuizAttemptResponse(BaseModel):
    """Quiz attempt response schema (for active attempts)."""

    attempt_id: int = Field(description="Attempt ID")
    quiz_id: int = Field(description="Quiz ID")
    quiz_title: str = Field(description="Quiz title")
    questions: List[QuestionResponse] = Field(description="Quiz questions")
    time_limit_minutes: Optional[int] = Field(default=None, description="Time limit in minutes")
    started_at: datetime = Field(description="Start time")

    class Config:
        json_schema_extra = {
            "example": {
                "attempt_id": 1,
                "quiz_id": 1,
                "quiz_title": "Cell Biology Basics",
                "questions": [
                    {
                        "id": 1,
                        "question_text": "What is the powerhouse of the cell?",
                        "question_type": "multiple_choice",
                        "options": ["Nucleus", "Mitochondria", "Ribosome", "Golgi apparatus"],
                        "points": 1,
                        "order": 0
                    }
                ],
                "time_limit_minutes": 30,
                "started_at": "2025-11-06T11:00:00Z"
            }
        }
