"""Quizzes Module Constants"""

from enum import Enum


class QuestionType(str, Enum):
    """Quiz question types"""
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    SHORT_ANSWER = "short_answer"


class Difficulty(str, Enum):
    """Quiz difficulty levels"""
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class SourceType(str, Enum):
    """Quiz source types"""
    MANUAL = "manual"
    AI_GENERATED = "ai_generated"


# Module Configuration
MODULE_NAME = "quizzes"
MODULE_DISPLAY_NAME = "Quizzes"
MODULE_DESCRIPTION = "AI-powered quiz generation and assessment"

# Quiz Configuration
DEFAULT_POINTS_PER_QUESTION = 1
MAX_QUESTIONS_PER_QUIZ = 100
MAX_OPTIONS_PER_QUESTION = 6

# Time Limits (minutes)
DEFAULT_TIME_LIMIT = None  # No limit
MAX_TIME_LIMIT = 180       # 3 hours

# Grading
PASSING_THRESHOLD = 0.7    # 70%
FUZZY_MATCH_THRESHOLD = 0.8  # For short answer matching
