import type {
    DashboardOverview,
    WeakArea,
    PerformanceTrend,
    HeatmapData,
    FlashcardResponse,
    NoteResponse,
    DocumentResponse,
    ChatSessionResponse,
    QuizResponse,
    TopicMastery,
} from '@/api/generated';

/**
 * Aggregated dashboard data from all sources
 */
export interface DashboardData {
    // Overview statistics
    overview: DashboardOverview | null;

    // Analytics data
    weakAreas: WeakArea[];
    performance: PerformanceTrend[];
    heatmap: HeatmapData[];
    topicMastery: TopicMastery[];

    // Resource data for knowledge graph
    dueCards: FlashcardResponse[];
    notes: NoteResponse[];
    documents: DocumentResponse[];
    chatSessions: ChatSessionResponse[];
    quizzes: QuizResponse[];
}

/**
 * Priority levels for queue items
 */
export type PriorityLevel = 'urgent' | 'high' | 'medium' | 'low';

/**
 * Module types
 */
export type ModuleType = 'flashcards' | 'notes' | 'documents' | 'chat' | 'quizzes';

/**
 * Queue item representing an actionable task
 * FIXED: Aligned with actual usage in useFocusQueue
 */
export interface QueueItem {
    id: string;
    type: 'flashcard' | 'note' | 'document' | 'quiz' | 'chat';
    moduleType: ModuleType; // Which module this belongs to
    title: string;
    description?: string;
    priority: number; // 0-1 calculated priority score
    dueDate?: string;
    estimatedMinutes?: number;
    metadata: {
        [key: string]: unknown;
    };
    actionUrl: string; // Direct navigation URL
}

/**
 * Session detection data
 */
export interface LearningSession {
    id: string;
    start: Date;
    end: Date;
    duration: number; // milliseconds
    activityCount: number;
    modules: string[];
    activities: ActivityEvent[];
}

/**
 * Activity event for session tracking
 */
export interface ActivityEvent {
    type: 'card_reviewed' | 'note_created' | 'document_uploaded' | 'chat_message' | 'quiz_completed';
    timestamp: Date;
    metadata: Record<string, unknown>;
}

/**
 * Milestone achievement
 */
export interface Milestone {
    id: string;
    type: 'streak' | 'mastery' | 'volume' | 'accuracy';
    title: string;
    description: string;
    achievedAt: Date;
    value: number;
    icon?: string;
}
