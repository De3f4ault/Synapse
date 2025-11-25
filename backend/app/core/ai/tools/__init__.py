"""
AI Tools Module

This module contains all SYNAPSE-specific AI tools that can be used by agents.
Tools follow the DeepAgents pattern for clean integration with Gemini function calling.
"""

from .base import BaseTool, ToolExecutionError, ToolValidationError
from .registry import ToolRegistry
from .flashcard_tools import (
    CreateFlashcardTool,
    SearchFlashcardsTool,
    GetDueCardsTool,
    UpdateFlashcardTool,
)
from .note_tools import (
    CreateNoteTool,
    SearchNotesTool,
    UpdateNoteTool,
    GetNoteHierarchyTool,
)
from .document_tools import (
    SearchDocumentsTool,
    GetDocumentContentTool,
    AnalyzeDocumentTool,
)
from .quiz_tools import (
    CreateQuizTool,
    EvaluateAnswerTool,
    GetQuizResultsTool,
)
from .context_tools import (
    GetUserContextTool,
    GetWeakAreasTool,
)
from .study_tools import (
    GetStudyRecommendationsTool,
    CreateStudyPlanTool,
    TrackStudyProgressTool,
)

__all__ = [
    # Base
    "BaseTool",
    "ToolExecutionError",
    "ToolValidationError",
    "ToolRegistry",
    # Flashcard tools
    "CreateFlashcardTool",
    "SearchFlashcardsTool",
    "GetDueCardsTool",
    "UpdateFlashcardTool",
    # Note tools
    "CreateNoteTool",
    "SearchNotesTool",
    "UpdateNoteTool",
    "GetNoteHierarchyTool",
    # Document tools
    "SearchDocumentsTool",
    "GetDocumentContentTool",
    "AnalyzeDocumentTool",
    # Quiz tools
    "CreateQuizTool",
    "EvaluateAnswerTool",
    "GetQuizResultsTool",
    # Context tools
    "GetUserContextTool",
    "GetWeakAreasTool",
    # Study tools
    "GetStudyRecommendationsTool",
    "CreateStudyPlanTool",
    "TrackStudyProgressTool",
]
