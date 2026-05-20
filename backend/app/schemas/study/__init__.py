"""
study/ — Flashcard, quiz, and study session schemas.

    from app.schemas.study import FlashcardResponse, QuizResponse, StudySessionCreate
"""

from app.schemas.study.flashcards import (
    DeckBase,
    DeckCreate,
    DeckUpdate,
    DeckResponse,
    DeckStatistics,
    FlashcardBase,
    FlashcardCreate,
    FlashcardUpdate,
    FlashcardResponse,
    ReviewCreate,
    ReviewResponse,
    ReviewResult,
    ReviewSubmit,
    DueCardResponse,
    FlashcardGenerateRequest,
    FlashcardGenerateFromTopicRequest,
    FlashcardGenerateResponse,
    ImportCard,
    ImportRequest,
    ImportResult,
)
from app.schemas.study.quizzes import (
    QuestionCreate,
    QuestionResponse,
    QuizCreate,
    QuizResponse,
    AnswerSubmit,
    QuizAttemptStart,
    AnswerResult,
    QuizResultResponse,
    PartialAnswer,
    QuizAttemptResume,
    QuizGenerateRequest,
    QuizGenerateResponse,
    DueQuestionResponse,
    DueQuestionsResponse,
    QuizInsightsResponse,
    RelatedFlashcardResponse,
    RelatedFlashcardsResponse,
    ContextNoteResponse,
    ContextForWeaknessResponse,
)
from app.schemas.study.sessions import (
    StudyItemResponse,
    StudySessionCreate,
    StudySessionResponse,
)

__all__ = [
    # flashcards.py
    "DeckBase",
    "DeckCreate",
    "DeckUpdate",
    "DeckResponse",
    "FlashcardBase",
    "FlashcardCreate",
    "FlashcardUpdate",
    "FlashcardResponse",
    "ReviewCreate",
    "ReviewResponse",
    # quizzes.py
    "QuestionCreate",
    "QuestionResponse",
    "QuizCreate",
    "QuizResponse",
    "AnswerSubmit",
    "QuizAttemptStart",
    "AnswerResult",
    "QuizResultResponse",
    "PartialAnswer",
    "QuizAttemptResume",
    # sessions.py
    "StudyItemResponse",
    "StudySessionCreate",
    "StudySessionResponse",
]
