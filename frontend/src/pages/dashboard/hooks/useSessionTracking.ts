/**
 * Session Tracking Hook - SIMPLIFIED STUB
 *
 * This is a simplified stub that maintains the same API as the old hook
 * but WITHOUT creating its own WebSocket connection.
 *
 * Future implementation should:
 * - Use centralized WebSocket infrastructure
 * - Connect to a proper /ws/activity endpoint (currently doesn't exist in backend)
 * - Integrate with backend activity tracking system
 */

import { useState, useCallback } from 'react';

/**
 * Activity log entry for session tracking
 */
export interface ActivityLogEntry {
    id: string;
    timestamp: string;
    activity_type: string;
    module: string;
    resource_id?: number;
    resource_title?: string;
    metadata?: Record<string, unknown>;
}

/**
 * Detected session information
 */
export interface DetectedSession {
    id: string;
    startTime: Date;
    endTime: Date;
    duration: number;
    activities: ActivityLogEntry[];
    primaryModule: string;
}

/**
 * Hook to track study sessions (STUB VERSION)
 *
 * NOTE: This is a temporary stub to maintain compatibility.
 * The old implementation created its own WebSocket connection to /ws/activity
 * which doesn't exist in the backend.
 *
 * For now, this provides the same API but with minimal functionality.
 * Activity tracking should be re-implemented properly when backend support is added.
 */
export function useSessionTracking() {
    const [activityLog] = useState<ActivityLogEntry[]>([]);
    const [sessions] = useState<DetectedSession[]>([]);
    const [currentSession] = useState<DetectedSession | null>(null);

    /**
     * Log an activity (stub - does nothing for now)
     */
    const logActivity = useCallback(
        (activity: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => {
            // Stub implementation - just create the activity object
            const newActivity: ActivityLogEntry = {
                id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                    timestamp: new Date().toISOString(),
                                    ...activity,
            };

            // In the future, this would:
            // 1. Add to local state
            // 2. Send to backend via API
            // 3. Receive real-time updates via WebSocket

            return newActivity;
        },
        []
    );

    /**
     * End current session (stub)
     */
    const endSession = useCallback(() => {
        // Stub - does nothing for now
    }, []);

    /**
     * Session statistics
     */
    const sessionStats = {
        totalSessions: sessions.length,
        totalActivities: activityLog.length,
        currentSessionActive: currentSession !== null,
        currentSessionDuration: currentSession ? currentSession.duration : 0,
        averageSessionDuration: 0,
    };

    return {
        currentSession,
        isInSession: currentSession !== null,
        sessions,
        activityLog,
        stats: sessionStats,
        logActivity,
        endSession,
    };
}
