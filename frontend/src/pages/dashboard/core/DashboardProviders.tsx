/**
 * DashboardProviders - Cross-module coordination
 * 
 * Similar to ChatProviders, this component:
 * - Provides context for the dashboard
 * - Handles session boundary coordination
 * - Resets module stores when context changes
 * 
 * This is where global invariants are tied together.
 */

import React, { useEffect, useRef } from "react";
import { useInsightsActions } from "../insights";
import { useDashboardStore } from "./state";

interface DashboardProvidersProps {
    children: React.ReactNode;
}

export function DashboardProviders({ children }: DashboardProvidersProps) {
    // Track time range changes for invalidation
    const timeRange = useDashboardStore((s) => s.timeRange);
    const prevTimeRangeRef = useRef(timeRange);

    // Insight actions for invalidation
    const { invalidate: invalidateInsights } = useInsightsActions();

    // Listen for time range changes to invalidate caches
    useEffect(() => {
        const prevTimeRange = prevTimeRangeRef.current;

        if (
            prevTimeRange.preset !== timeRange.preset ||
            prevTimeRange.start.getTime() !== timeRange.start.getTime() ||
            prevTimeRange.end.getTime() !== timeRange.end.getTime()
        ) {
            // Time range changed - invalidate computed insights
            invalidateInsights();
        }

        prevTimeRangeRef.current = timeRange;
    }, [timeRange, invalidateInsights]);

    // Mark dashboard as refreshed on mount
    useEffect(() => {
        useDashboardStore.getState().markRefreshed();
    }, []);

    // Auto-refresh logic
    useEffect(() => {
        const refresh = useDashboardStore.getState().refresh;

        if (!refresh.autoRefresh) return;

        const intervalId = setInterval(() => {
            invalidateInsights();
            useDashboardStore.getState().markRefreshed();
        }, refresh.intervalMs);

        return () => clearInterval(intervalId);
    }, [invalidateInsights]);

    return <>{children}</>;
}
