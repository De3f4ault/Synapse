"""
Flashcard schemas — single source of truth for flashcard, deck, and review API contracts.
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field, computed_field


# Deck Schemas

class DeckBase(BaseModel):
    """Base deck schema."""

    name: str = Field(min_length=1, max_length=255, description="Deck name")
    description: Optional[str] = Field(default=None, description="Deck description")
    tags: List[str] = Field(default_factory=list, description="Deck tags")
    is_public: bool = Field(default=False, description="Whether deck is public")


class DeckCreate(DeckBase):
    """Deck creation schema."""

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Biology Basics",
                "description": "Fundamental biology concepts",
                "tags": ["biology", "science"],
                "is_public": False
            }
        }


class DeckUpdate(BaseModel):
    """Deck update schema."""

    name: Optional[str] = Field(default=None, min_length=1, max_length=255, description="Deck name")
    description: Optional[str] = Field(default=None, description="Deck description")
    tags: Optional[List[str]] = Field(default=None, description="Deck tags")
    is_public: Optional[bool] = Field(default=None, description="Whether deck is public")


class DeckResponse(DeckBase):
    """Deck response schema."""

    id: int = Field(description="Deck ID")
    user_id: int = Field(description="Owner user ID")
    card_count: int = Field(default=0, description="Number of cards in deck")
    due_count: int = Field(default=0, description="Cards due for review")
    ai_generated: bool = Field(default=False, description="Whether AI generated")
    created_at: datetime = Field(description="Creation time")
    updated_at: datetime = Field(description="Last update time")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "user_id": 1,
                "name": "Biology Basics",
                "description": "Fundamental biology concepts",
                "tags": ["biology", "science"],
                "is_public": False,
                "card_count": 25,
                "ai_generated": False,
                "created_at": "2025-11-01T10:00:00Z",
                "updated_at": "2025-11-06T12:00:00Z"
            }
        }


# Flashcard Schemas

class FlashcardBase(BaseModel):
    """Base flashcard schema."""

    front_text: str = Field(min_length=1, max_length=10000, description="Front of card")
    back_text: str = Field(min_length=1, max_length=10000, description="Back of card")
    front_media_url: Optional[str] = Field(default=None, description="Front media URL")
    back_media_url: Optional[str] = Field(default=None, description="Back media URL")


class FlashcardCreate(FlashcardBase):
    """Flashcard creation schema."""

    deck_id: int = Field(description="Deck ID")

    class Config:
        json_schema_extra = {
            "example": {
                "deck_id": 1,
                "front_text": "What is photosynthesis?",
                "back_text": "The process by which plants convert light energy into chemical energy",
                "front_media_url": None,
                "back_media_url": None
            }
        }


class FlashcardUpdate(BaseModel):
    """Flashcard update schema."""

    front_text: Optional[str] = Field(default=None, min_length=1, max_length=10000, description="Front of card")
    back_text: Optional[str] = Field(default=None, min_length=1, max_length=10000, description="Back of card")
    front_media_url: Optional[str] = Field(default=None, description="Front media URL")
    back_media_url: Optional[str] = Field(default=None, description="Back media URL")


class FlashcardResponse(FlashcardBase):
    """
    Flashcard response schema.

    ✅ FIXED: Now matches the actual database model fields exactly.
    """

    id: int = Field(description="Card ID")
    deck_id: int = Field(description="Deck ID")
    ease_factor: Decimal = Field(description="Ease factor for SM-2")
    interval: int = Field(description="Current interval in days")
    repetitions: int = Field(description="Number of successful repetitions")

    # ✅ FIXED: Changed from last_review to match model
    last_review: Optional[datetime] = Field(default=None, description="Last review time")
    next_review: Optional[datetime] = Field(default=None, description="Next review time")

    # ✅ FIXED: Changed to string to match LearningState enum serialization
    learning_state: str = Field(description="Learning state (new, learning, review, mastered)")

    # ✅ FIXED: Added all actual model fields
    times_reviewed: int = Field(description="Total times reviewed")
    times_correct: int = Field(description="Times answered correctly")
    times_incorrect: int = Field(description="Times answered incorrectly")
    created_at: datetime = Field(description="Creation time")

    @computed_field
    @property
    def accuracy(self) -> float:
        """
        Calculate accuracy rate.

        ✅ FIXED: Returns 0.0 instead of None for consistency,
        and returns percentage (0-100) instead of decimal (0-1).
        """
        if self.times_reviewed == 0:
            return 0.0
        return (self.times_correct / self.times_reviewed) * 100.0

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "deck_id": 1,
                "front_text": "What is photosynthesis?",
                "back_text": "The process by which plants convert light energy into chemical energy",
                "front_media_url": None,
                "back_media_url": None,
                "ease_factor": 2.5,
                "interval": 7,
                "repetitions": 3,
                "last_review": "2025-11-01T10:00:00Z",
                "next_review": "2025-11-08T10:00:00Z",
                "learning_state": "review",
                "times_reviewed": 5,
                "times_correct": 4,
                "times_incorrect": 1,
                "accuracy": 80.0,
                "created_at": "2025-10-25T10:00:00Z"
            }
        }


# Review Schemas

class ReviewCreate(BaseModel):
    """Review creation schema."""

    card_id: int = Field(description="Card ID")
    quality: int = Field(ge=0, le=5, description="Quality rating (0-5)")
    time_taken_ms: int = Field(ge=0, description="Time taken in milliseconds")

    class Config:
        json_schema_extra = {
            "example": {
                "card_id": 1,
                "quality": 4,
                "time_taken_ms": 5000
            }
        }


class ReviewResponse(BaseModel):
    """Review response schema."""

    id: int = Field(description="Review ID")
    card_id: int = Field(description="Card ID")
    user_id: int = Field(description="User ID")
    quality: int = Field(description="Quality rating")
    ease_factor_before: Decimal = Field(description="Ease factor before review")
    ease_factor_after: Decimal = Field(description="Ease factor after review")
    interval_before: int = Field(description="Interval before review")
    interval_after: int = Field(description="Interval after review")
    time_taken_ms: int = Field(description="Time taken in milliseconds")
    reviewed_at: datetime = Field(description="Review time")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "card_id": 1,
                "user_id": 1,
                "quality": 4,
                "ease_factor_before": 2.5,
                "ease_factor_after": 2.6,
                "interval_before": 3,
                "interval_after": 7,
                "time_taken_ms": 5000,
                "reviewed_at": "2025-11-06T12:00:00Z"
            }
        }


class ReviewResult(BaseModel):
    """Review result schema (returned after recording review)."""

    next_review_date: datetime = Field(description="Next review date")
    new_interval: int = Field(description="New interval in days")
    new_ease_factor: Decimal = Field(description="New ease factor")
    success: bool = Field(description="Whether operation succeeded")
    message: str = Field(description="Result message")

    class Config:
        json_schema_extra = {
            "example": {
                "next_review_date": "2025-11-13T12:00:00Z",
                "new_interval": 7,
                "new_ease_factor": 2.6,
                "success": True,
                "message": "Review recorded successfully"
            }
        }


class DeckStatistics(BaseModel):
    """Deck statistics schema."""

    total_cards: int = Field(description="Total cards in deck")
    new_cards: int = Field(description="New cards")
    learning_cards: int = Field(description="Cards in learning state")
    review_cards: int = Field(description="Cards in review state")
    mastered_cards: int = Field(description="Mastered cards")
    due_cards: int = Field(description="Cards due for review")
    avg_ease_factor: Optional[Decimal] = Field(default=None, description="Average ease factor")
    avg_accuracy: Optional[float] = Field(default=None, description="Average accuracy")

    class Config:
        json_schema_extra = {
            "example": {
                "total_cards": 50,
                "new_cards": 10,
                "learning_cards": 15,
                "review_cards": 20,
                "mastered_cards": 5,
                "due_cards": 12,
                "avg_ease_factor": 2.5,
                "avg_accuracy": 82.0
            }
        }


class DueCardResponse(BaseModel):
    """
    Due card DTO — matches get_due_cards() SQL function output.

    Distinct from FlashcardResponse because the SQL function returns
    calculated fields (deck_name, overdue_days, priority_score) that
    don't exist on the ORM model.
    """

    id: int
    deck_id: int
    front_text: str
    back_text: str
    front_media_url: Optional[str] = None
    back_media_url: Optional[str] = None

    # SM-2 algorithm fields
    ease_factor: float = 2.5
    interval: int = 0
    repetitions: int = 0
    last_review: Optional[datetime] = None
    next_review: Optional[datetime] = None
    learning_state: str = "NEW"

    # Review statistics
    times_reviewed: int = 0
    accuracy: float = 0.0

    # Extra fields from get_due_cards() SQL JOIN
    deck_name: Optional[str] = None
    overdue_days: Optional[int] = 0
    priority_score: Optional[float] = 0.0

    class Config:
        from_attributes = True
        extra = "ignore"


class ReviewSubmit(BaseModel):
    """Review submission (card_id passed via URL, not body)."""

    quality: int = Field(..., ge=0, le=5, description="Quality rating 0-5")
    time_taken_ms: int = Field(..., ge=0, description="Time taken in milliseconds")


# ============================================================================
# Generation & Import Schemas
# ============================================================================


class FlashcardGenerateRequest(BaseModel):
    """Flashcard generation from document request."""

    document_id: int = Field(..., description="Document to generate from")
    deck_name: str = Field(..., min_length=1, max_length=255, description="Deck name")
    num_cards: int = Field(10, ge=1, le=50, description="Number of flashcards")
    difficulty: str = Field("medium", description="Difficulty: easy, medium, hard")
    tags: Optional[List[str]] = None


class FlashcardGenerateFromTopicRequest(BaseModel):
    """Flashcard generation from topic (like quiz generation)."""

    topic: str = Field(..., min_length=3, max_length=500, description="Topic")
    deck_name: Optional[str] = Field(None, max_length=255, description="Optional deck name")
    num_cards: int = Field(10, ge=5, le=50, description="Number of flashcards")
    difficulty: str = Field("medium", description="Difficulty: easy, medium, hard")
    tags: Optional[List[str]] = None


class FlashcardGenerateResponse(BaseModel):
    """Flashcard generation response."""

    deck_id: int
    deck_name: str
    cards_generated: int
    status: str
    message: str


class ImportCard(BaseModel):
    """Card data for import."""

    front: str = Field(..., min_length=1)
    back: str = Field(..., min_length=1)


class ImportRequest(BaseModel):
    """Bulk import request."""

    cards: List[ImportCard] = Field(..., min_length=1, max_length=1000)


class ImportResult(BaseModel):
    """Import result."""

    imported: int
    skipped_duplicates: int
    errors: List[str]
    message: str
