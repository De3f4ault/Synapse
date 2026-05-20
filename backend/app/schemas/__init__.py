"""
Pydantic schemas for request/response validation.

STRUCTURE:
    schemas/
    ├── common/       - Base types, pagination, platform enums
    ├── auth/         - Auth, token, and user schemas
    ├── documents/    - Document management (11 sub-schemas)
    ├── notes/        - Note schemas
    ├── chat/         - Chat, threads, branches
    ├── study/        - Flashcards, quizzes, sessions
    ├── search/       - Search queries, results, context, feedback
    ├── intelligence/ - Analytics, grounding, RAG, AI context
    ├── graph/        - Knowledge graph links and edges
    ├── notifications/- Notification schemas
    ├── webhooks/     - Webhook schemas
    ├── workflows/    - Workflow schemas
    ├── platform/     - Platform entity contracts and belief model
    ├── health.py     - Health check (standalone)
    ├── upload.py     - Upload response (standalone)
    └── task.py       - Task status (standalone)

IMPORT RULE:
    Prefer direct domain imports:
        from app.schemas.documents import DocumentResponse
        from app.schemas.search import UnifiedSearchResponse
    Avoid importing from this root module in new code.
"""

# ── Transitional re-exports (backward compatibility during migration) ─────────
# These keep existing flat imports working while we update import sites.
# Remove each line once all consumers have been updated.

from app.schemas.common import (
    PaginationParams,
    PaginatedResponse,
    APIResponse,
    MessageResponse,
    EntityType,
    EntityCapability,
    ModuleId,
    EntityVisibility,
    ActionStatus,
)
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    TokenResponse,
    TokenData,
    PasswordChange,
    PasswordReset,
    PasswordResetConfirm,
    UserBase,
    UserCreate,
    UserUpdate,
    UserResponse,
    UserStatistics,
    UserPreferences,
)
from app.schemas.documents import (
    DocumentResponse,
    DocumentUpdateRequest,
    DocumentChunkResponse,
    ProcessingStatusResponse,
    ConflictType,
    DuplicateConflictResponse,
    MoveDocumentRequest,
    SummaryResponse,
    DocumentAnalysisRequest,
    DocumentAnalysisResponse,
    StorageBreakdownItem,
    RecentActivityItem,
    DocumentStatisticsResponse,
    DocumentMetadataResponse,
    DocumentNoteCreate,
    DocumentNoteResponse,
    DocumentTypeCreate,
    DocumentTypeUpdate,
    DocumentTypeResponse,
    FolderSettingsSchema,
    FolderResponse,
    FolderTreeNode,
    CreateFolderRequest,
    UpdateFolderRequest,
    MoveFolderRequest,
    DeleteStrategy,
    PermissionEntry,
    PermissionsSet,
    DocumentPermissionResponse,
    SetPermissionsRequest,
    ShareLinkCreate,
    ShareLinkResponse,
    FilterRuleCreate,
    FilterRuleResponse,
    SavedViewCreate,
    SavedViewUpdate,
    SavedViewResponse,
    BulkEditRequest,
    CorrespondentCreate,
    CorrespondentUpdate,
    CorrespondentResponse,
    StoragePathCreate,
    StoragePathUpdate,
    StoragePathResponse,
)
from app.schemas.notes import (
    NoteBase,
    NoteCreate,
    NoteUpdate,
    NoteResponse,
    NoteTreeResponse,
    NoteVersionResponse,
    NoteSearchResult,
)
from app.schemas.chat import (
    ChatSessionCreate,
    ChatSessionResponse,
    ChatMessageCreate,
    NotesMessageCreate,
    ChatMessageResponse,
    ChatHistoryResponse,
    AIModelResponse,
    WSChatMessage,
    WSChatToken,
    ThreadCreate,
    ThreadUpdate,
    ThreadResponse,
    ThreadMessageCreate,
    ThreadListResponse,
    BranchCreateRequest,
    BranchSiblingInfo,
    BranchSiblingsResponse,
    BranchActivateResponse,
)
from app.schemas.study import (
    DeckBase,
    DeckCreate,
    DeckUpdate,
    DeckResponse,
    FlashcardBase,
    FlashcardCreate,
    FlashcardUpdate,
    FlashcardResponse,
    ReviewCreate,
    ReviewResponse,
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
    StudyItemResponse,
    StudySessionCreate,
    StudySessionResponse,
)
from app.schemas.search import (
    SearchResult,
    SearchResponse,
    HybridSearchResult,
    HybridSearchResponse,
    UnifiedSearchRequest,
    SearchClickRequest,
    SearchClickResponse,
    AutocompleteResult,
    AutocompleteResponse,
    SearchIntent,
    SearchContext,
    FeedbackSource,
    FeedbackEvent,
    IdentityAuthority,
    SearchEntityIdentity,
    SearchRole,
    AssertionType,
    UnifiedSearchResult,
    EngineResult,
    UnifiedSearchResponse,
)
from app.schemas.intelligence import (
    QualifiedSignal,
    IntelligenceSummary,
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
    MasteryScore,
    RecentActivity,
    ModuleContext,
    ContextRequest,
    ContextResponse,
    ContextInvalidationRequest,
    ConfidenceLevel,
    EvidenceChunk,
    EvidenceUsage,
    GroundingResult,
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
from app.schemas.graph import (
    LinkCreate,
    LinkUpdate,
    LinkResponse,
    EntityLinksResponse,
    GraphNode,
    GraphEdge,
    GraphStats,
    KnowledgeGraphResponse,
    ConnectedEntityResponse,
)
from app.schemas.notifications import (
    NotificationType,
    NotificationCategory,
    NotificationStatus,
    NotificationBase,
    NotificationCreate,
    NotificationResponse,
    NotificationList,
    MarkAsReadRequest,
    ClearNotificationsRequest,
    DNDSchedule,
    CategoryPreferences,
    NotificationPreferences,
    UpdatePreferencesRequest,
    TestNotificationRequest,
)
from app.schemas.webhooks import (
    WebhookCreate,
    WebhookUpdate,
    WebhookResponse,
    WebhookEventResponse,
    WebhookTestRequest,
    WebhookTestResponse,
    WebhookEventTypesResponse,
    WebhookPayload,
)
from app.schemas.workflows import (
    WorkflowTriggerCreate,
    WorkflowTriggerUpdate,
    WorkflowTriggerResponse,
    WorkflowActionCreate,
    WorkflowActionUpdate,
    WorkflowActionResponse,
    WorkflowCreate,
    WorkflowUpdate,
    WorkflowResponse,
    WorkflowListResponse,
    WorkflowRunResponse,
)
from app.schemas.platform import (
    EntityIdentity,
    EntitySearchResult,
    ResolvedCapability,
    LearningEntity,
    PlatformAction,
    GraphContext,
    WeaknessEvidence,
    ConceptState,
    AssistantContext,
    EntityRelation,
    GraphEffect,
    ActionError,
    PlatformActionResult,
    ActionRequest,
)
