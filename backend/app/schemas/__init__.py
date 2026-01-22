"""
Pydantic schemas for request/response validation.

This module exports all schema classes used throughout the SYNAPSE application.
"""

from app.schemas.common import *
from app.schemas.auth import *
from app.schemas.user import *
from app.schemas.flashcard import *
from app.schemas.note import *
from app.schemas.document import *
from app.schemas.quiz import *
from app.schemas.chat import *
from app.schemas.chat_thread import *
from app.schemas.context import *
from app.schemas.webhook import *
from app.schemas.rag import *

__all__ = [
    # Common
    "PaginationParams",
    "APIResponse",
    "MessageResponse",
    # Auth
    "UserRegister",
    "UserLogin",
    "TokenResponse",
    "TokenData",
    # User
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    # Flashcard
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
    "ReviewResult",
    # Note
    "NoteBase",
    "NoteCreate",
    "NoteUpdate",
    "NoteResponse",
    "NoteTreeResponse",
    "NoteVersionResponse",
    "TagBase",
    "TagCreate",
    "TagResponse",
    # Document
    "DocumentUpload",
    "DocumentResponse",
    "DocumentChunkResponse",
    # Quiz
    "QuizCreate",
    "QuizResponse",
    "QuestionCreate",
    "QuestionResponse",
    "QuizAttemptCreate",
    "AnswerSubmit",
    "QuizResultResponse",
    "AnswerResult",
    # Chat
    "ChatSessionCreate",
    "ChatSessionResponse",
    "ChatMessageCreate",
    "ChatMessageResponse",
    "ChatHistoryResponse",
    # Chat Threads
    "ThreadCreate",
    "ThreadUpdate",
    "ThreadResponse",
    "ThreadListResponse",
    "ThreadMessageCreate",
    # Context
    "ContextRequest",
    "ContextResponse",
    "WeakArea",
    "MasteryScore",
    # Webhook
    "WebhookCreate",
    "WebhookUpdate",
    "WebhookResponse",
    "WebhookEventResponse",
    "WebhookTestResponse",
    # RAG
    "RAGQueryRequest",
    "RAGQueryResponse",
    "RAGChunk",
    "RAGSource",
]
