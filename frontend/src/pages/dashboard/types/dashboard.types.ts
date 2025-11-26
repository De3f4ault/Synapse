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
} from '@/api/generated/types.gen';

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

    // Resource data for knowledge graph
    dueCards: FlashcardResponse[];
    notes: NoteResponse[];
    documents: DocumentResponse[];
    chatSessions: ChatSessionResponse[];
    quizzes: QuizResponse[];
}

/**
 * Intelligence insights generated from dashboard data
 */
export interface IntelligenceInsight {
    type: 'context' | 'weak_area' | 'milestone' | 'next_action';
    title: string;
    message: string;
    severity?: 'low' | 'medium' | 'high';
    action?: {
        label: string;
        onClick: () => void;
    };
    metadata?: Record<string, unknown>;
}

/**
 * Priority levels for queue items
 */
export type PriorityLevel = 'urgent' | 'high' | 'medium' | 'low';

/**
 * Queue item representing an actionable task
 */
export interface QueueItem {
    id: string;
    type: 'flashcard' | 'note' | 'document' | 'quiz' | 'chat';
    title: string;
    description?: string;
    priority: PriorityLevel;
    priorityScore: number; // 0-1 calculated score
    dueDate?: string;
    metadata: {
        moduleId: number;
        moduleName: string;
        accuracy?: number;
        reviewCount?: number;
        lastReviewed?: string;
        [key: string]: unknown;
    };
    action: () => void;
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
