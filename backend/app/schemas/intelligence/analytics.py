"""
Analytics domain schemas.

Dashboard overview, performance trends, weak areas, heatmaps, and forecasts.
"""

from typing import List, Dict, Optional
from enum import Enum
from pydantic import BaseModel


# ============================================================================
# Enums
# ============================================================================


class TimeBucket(str, Enum):
    """Time bucket for aggregation."""

    DAY = "day"
    WEEK = "week"
    MONTH = "month"


class AggregationStrategy(str, Enum):
    """How to aggregate accuracy/performance across time buckets."""

    EVENT_WEIGHTED = "event_weighted"
    DURATION_WEIGHTED = "duration_weighted"


# ============================================================================
# Response Schemas
# ============================================================================


class DashboardOverview(BaseModel):
    """Dashboard overview statistics with flashcard + quiz metrics."""

    total_study_time_minutes: int
    overall_accuracy: float
    total_learning_events: int = 0
    study_streak_days: int

    # Flashcard metrics
    total_cards: int
    due_cards: int
    cards_reviewed_today: int = 0
    total_decks: int
    flashcard_accuracy: float = 0.0
    flashcard_study_time_minutes: int = 0
    total_flashcard_reviews: int = 0

    # Quiz metrics
    total_quizzes: int = 0
    total_quiz_attempts: int = 0
    quiz_accuracy: float = 0.0
    quiz_study_time_minutes: int = 0

    # Other
    total_notes: int
    total_documents: int
    analytics_version: str = "2.0.0-quiz"
    learning_event_count: int = 0
    data_sources: Dict[str, str] = {}


class WeakArea(BaseModel):
    """Weak area identification."""

    topic: str
    accuracy: float
    review_count: int
    severity: str


class PerformanceTrend(BaseModel):
    """Performance over time."""

    date: str
    reviews_count: int
    accuracy: float
    study_time_minutes: int


class TopicMastery(BaseModel):
    """Mastery level per topic."""

    topic: str
    mastery_score: float
    card_count: int
    avg_ease_factor: float


class HeatmapData(BaseModel):
    """Activity heatmap data point."""

    date: str
    activity_count: int


class TodayStats(BaseModel):
    """Today's study statistics from Learning Ledger."""

    study_time_minutes: int
    learning_events: int
    reviews_completed: int
    average_accuracy: float
    data_source: str = "learning_ledger"


class ReviewForecast(BaseModel):
    """Review forecast for planning."""

    due_today: int
    due_tomorrow: int
    due_this_week: int
    overdue: int


class LastSessionStats(BaseModel):
    """Last study session quality feedback."""

    cards_reviewed: int
    duration_minutes: int
    accuracy_percent: float
    quality_label: str
    ended_at: str | None
    has_session: bool
