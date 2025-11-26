/**
 * Session Detection Utility
 *
 * Detects learning sessions from activity logs using a sliding window algorithm.
 * Groups activities into sessions based on time gaps (30-minute timeout by default).
 *
 * Algorithm:
 * 1. Sort activities by timestamp
 * 2. Start with first activity as session start
 * 3. If next activity is within timeout window, add to current session
 * 4. If gap exceeds timeout, close session and start new one
 * 5. Extract session metadata (duration, modules, resources)
 */

/**
 * Detected study session
 */
export interface DetectedSession {
    id: string;
    startTime: Date;
    endTime: Date;
    duration: number; // in milliseconds
    activityCount: number;
    modulesUsed: string[];
    resourcesAccessed: Array<{
        type: string;
        id: number;
        title?: string;
    }>;
}

/**
 * Activity log entry (simplified from backend ActivityLog type)
 */
interface ActivityLogEntry {
    id: string;
    timestamp: string;
    activity_type: string;
    module: string;
    resource_id?: number;
    resource_title?: string;
    metadata?: Record<string, unknown>;
}

/**
 * Session detection configuration
 */
export interface SessionDetectorConfig {
    /**
     * Maximum time gap (ms) between activities to be in same session
     * Default: 30 minutes (1800000ms)
     */
    sessionTimeout: number;

    /**
     * Minimum activities to count as a session
     * Default: 2
     */
    minActivities: number;

    /**
     * Minimum session duration (ms) to be valid
     * Default: 5 minutes (300000ms)
     */
    minDuration: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: SessionDetectorConfig = {
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    minActivities: 2,
    minDuration: 5 * 60 * 1000, // 5 minutes
};

/**
 * Detect study sessions from activity log
 *
 * @param activities - Array of activity log entries
 * @param config - Session detection configuration
 * @returns Array of detected sessions
 */
export function detectSessions(
    activities: ActivityLogEntry[],
    config: Partial<SessionDetectorConfig> = {}
): DetectedSession[] {
    const cfg = { ...DEFAULT_CONFIG, ...config };

    if (!activities || activities.length === 0) {
        return [];
    }

    // Sort activities by timestamp (oldest first)
    const sorted = [...activities].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const sessions: DetectedSession[] = [];
    let currentSession: {
        startTime: Date;
        activities: ActivityLogEntry[];
    } | null = null;

    for (const activity of sorted) {
        const activityTime = new Date(activity.timestamp);

        if (!currentSession) {
            // Start new session
            currentSession = {
                startTime: activityTime,
                activities: [activity],
            };
        } else {
            // Check time gap from last activity
            const lastActivity = currentSession.activities[currentSession.activities.length - 1];
            const lastTime = new Date(lastActivity.timestamp);
            const gap = activityTime.getTime() - lastTime.getTime();

            if (gap <= cfg.sessionTimeout) {
                // Continue current session
                currentSession.activities.push(activity);
            } else {
                // Close current session and start new one
                const session = buildSession(currentSession, cfg);
                if (session) {
                    sessions.push(session);
                }

                currentSession = {
                    startTime: activityTime,
                    activities: [activity],
                };
            }
        }
    }

    // Close final session
    if (currentSession) {
        const session = buildSession(currentSession, cfg);
        if (session) {
            sessions.push(session);
        }
    }

    return sessions;
}

/**
 * Build a session object from accumulated activities
 */
function buildSession(
    sessionData: { startTime: Date; activities: ActivityLogEntry[] },
    config: SessionDetectorConfig
): DetectedSession | null {
    const { startTime, activities } = sessionData;

    // Validate minimum activities
    if (activities.length < config.minActivities) {
        return null;
    }

    // Calculate end time (last activity timestamp)
    const endTime = new Date(activities[activities.length - 1].timestamp);

    // Calculate duration
    const duration = endTime.getTime() - startTime.getTime();

    // Validate minimum duration
    if (duration < config.minDuration) {
        return null;
    }

    // Extract modules used (unique)
    const modulesSet = new Set<string>();
    activities.forEach((a) => {
        if (a.module) {
            modulesSet.add(a.module);
        }
    });

    // Extract resources accessed (unique)
    const resourcesMap = new Map<string, { type: string; id: number; title?: string }>();
    activities.forEach((a) => {
        if (a.resource_id) {
            const key = `${a.module}-${a.resource_id}`;
            if (!resourcesMap.has(key)) {
                resourcesMap.set(key, {
                    type: a.module,
                    id: a.resource_id,
                    title: a.resource_title,
                });
            }
        }
    });

    return {
        id: `session-${startTime.getTime()}`,
        startTime,
        endTime,
        duration,
        activityCount: activities.length,
        modulesUsed: Array.from(modulesSet),
        resourcesAccessed: Array.from(resourcesMap.values()),
    };
}

/**
 * Group sessions by date for display
 *
 * @param sessions - Array of detected sessions
 * @returns Map of date string to sessions
 */
export function groupSessionsByDate(
    sessions: DetectedSession[]
): Map<string, DetectedSession[]> {
    const grouped = new Map<string, DetectedSession[]>();

    sessions.forEach((session) => {
        const dateKey = session.startTime.toISOString().split('T')[0];
        const existing = grouped.get(dateKey) || [];
        existing.push(session);
        grouped.set(dateKey, existing);
    });

    return grouped;
}

/**
 * Calculate session statistics
 *
 * @param sessions - Array of detected sessions
 * @returns Session statistics
 */
export function calculateSessionStats(sessions: DetectedSession[]) {
    if (sessions.length === 0) {
        return {
            totalSessions: 0,
            totalDuration: 0,
            averageDuration: 0,
            averageActivities: 0,
            mostUsedModule: null as string | null,
            longestSession: null as DetectedSession | null,
        };
    }

    const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0);
    const totalActivities = sessions.reduce((sum, s) => sum + s.activityCount, 0);

    // Find most used module
    const moduleCount = new Map<string, number>();
    sessions.forEach((session) => {
        session.modulesUsed.forEach((module) => {
            moduleCount.set(module, (moduleCount.get(module) || 0) + 1);
        });
    });

    let mostUsedModule: string | null = null;
    let maxCount = 0;
    moduleCount.forEach((count, module) => {
        if (count > maxCount) {
            maxCount = count;
            mostUsedModule = module;
        }
    });

    // Find longest session
    const longestSession = sessions.reduce(
        (longest, session) => {
            if (!longest || session.duration > longest.duration) {
                return session;
            }
            return longest;
        },
        null as DetectedSession | null
    );

    return {
        totalSessions: sessions.length,
        totalDuration,
        averageDuration: Math.round(totalDuration / sessions.length),
        averageActivities: Math.round(totalActivities / sessions.length),
        mostUsedModule,
        longestSession,
    };
}

/**
 * Format session duration to human-readable string
 *
 * @param durationMs - Duration in milliseconds
 * @returns Formatted duration string (e.g., "2h 15m", "45m", "1h")
 */
export function formatSessionDuration(durationMs: number): string {
    const minutes = Math.floor(durationMs / (60 * 1000));

    if (minutes < 60) {
        return `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
        return `${hours}h`;
    }

    return `${hours}h ${remainingMinutes}m`;
}
