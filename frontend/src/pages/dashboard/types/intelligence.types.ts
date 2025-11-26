import type { WeakArea } from '@/api/generated/types.gen';
import type { QueueItem } from './dashboard.types';

/**
 * Context insight from backend context engine
 */
export interface ContextInsight {
    type: 'weak_area' | 'breakthrough' | 'pattern' | 'recommendation';
    topic: string;
    confidence: number; // 0-1
    message: string;
    relatedResources: Array<{
        type: string;
        id: number;
        title: string;
    }>;
    actionable: boolean;
    action?: {
        type: 'deep_dive' | 'review' | 'explore';
        target: string;
    };
}

/**
 * Processed weak area with additional context
 */
export interface ProcessedWeakArea extends WeakArea {
    priority: number; // 0-1 calculated priority
    action: {
        label: string;
        onClick: () => void;
    };
    lastReviewed?: string;
    improvementTrend?: 'up' | 'down' | 'stable';
}

/**
 * Next action recommendation
 */
export interface NextAction {
    id: string;
    title: string;
    reason: string;
    priority: number; // 0-1
    type: 'review' | 'learn' | 'practice' | 'explore';
    estimatedTime?: number; // minutes
    action: () => void;
    metadata: {
        relatedWeakAreas?: string[];
        potentialImpact: 'high' | 'medium' | 'low';
        [key: string]: unknown;
    };
}

/**
 * Milestone detection result
 */
export interface MilestoneDetection {
    detected: boolean;
    type: 'streak' | 'mastery' | 'volume' | 'accuracy';
    title: string;
    description: string;
    value: number;
    threshold: number;
    achieved: boolean;
}

/**
 * Intelligence processing result
 */
export interface IntelligenceResult {
    contextInsights: ContextInsight[];
    weakAreas: ProcessedWeakArea[];
    nextAction: NextAction | null;
    milestones: MilestoneDetection[];
    queueItems: QueueItem[];
}
