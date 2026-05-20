"""
intelligence/ — AI analytics, context, grounding, and RAG schemas.

    from app.schemas.intelligence import QualifiedSignal, UnifiedSearchResponse
"""

from app.schemas.intelligence.intelligence import (
    QualifiedSignal,
    IntelligenceSummary,
)
from app.schemas.intelligence.analytics import (
    TimeBucket,
    AggregationStrategy,
    DashboardOverview,
    WeakArea,
    PerformanceTrend,
    TopicMastery,
    HeatmapData,
    TodayStats,
    ReviewForecast,
    LastSessionStats,
)
from app.schemas.intelligence.context import (
    MasteryScore,
    RecentActivity,
    ModuleContext,
    ContextRequest,
    ContextResponse,
    ContextInvalidationRequest,
)
from app.schemas.intelligence.grounding import (
    ConfidenceLevel,
    EvidenceChunk,
    EvidenceUsage,
    GroundingResult,
)
from app.schemas.intelligence.rag import (
    SourceType,
    LLMEnhancementStrategy,
    TaskStatus,
    DocumentIngestRequest,
    QueryRequest,
    FeedbackRequest,
    DocumentIngestResponse,
    QueryChunk,
    QueryResponse,
    FeedbackResponse,
    TaskStatusResponse,
    BatchIngestRequest,
    BatchIngestResponse,
)

__all__ = [
    # intelligence.py
    "QualifiedSignal",
    "IntelligenceSummary",
    # analytics.py
    "TimeBucket",
    "AggregationStrategy",
    "DashboardOverview",
    "WeakArea",
    "PerformanceTrend",
    "TopicMastery",
    "HeatmapData",
    "TodayStats",
    "ReviewForecast",
    "LastSessionStats",
    # context.py
    "MasteryScore",
    "RecentActivity",
    "ModuleContext",
    "ContextRequest",
    "ContextResponse",
    "ContextInvalidationRequest",
    # grounding.py
    "ConfidenceLevel",
    "EvidenceChunk",
    "EvidenceUsage",
    "GroundingResult",
    # rag.py
    "SourceType",
    "LLMEnhancementStrategy",
    "TaskStatus",
    "DocumentIngestRequest",
    "QueryRequest",
    "FeedbackRequest",
    "DocumentIngestResponse",
    "QueryChunk",
    "QueryResponse",
    "FeedbackResponse",
    "TaskStatusResponse",
    "BatchIngestRequest",
    "BatchIngestResponse",
]
