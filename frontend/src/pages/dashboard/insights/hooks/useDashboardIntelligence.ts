/**
 * useDashboardIntelligence - Unified Search Integration for Dashboard
 * 
 * Consumes the Search Intelligence Bus with intent=diagnose.
 * This is the ONLY source of intelligence data for Dashboard.
 * 
 * Contract enforcement:
 * - Only accepts role=diagnostic
 * - Only accepts assertion_type=heuristic
 * - Only accepts source=graph
 * 
 * Graceful degradation:
 * - If graph engine is down, shows "Insights temporarily unavailable"
 * - Never falls back to hardcoded data
 */

import { useDashboardDiagnostics } from "@/api/unified-search";
import { useMemo } from "react";
import type { UnifiedSearchResult } from "@/api/unified-search";

// =============================================================================
// Types
// =============================================================================

export interface DiagnosticInsight {
    id: string;
    conceptName: string;
    mastery: number;
    stability: number;
    volatility: number;
    trend: "up" | "down" | "neutral";
    isWeakArea: boolean;
    isFragile: boolean;
    confidence: number | null | undefined;
    lastUpdated: string;
}

export interface DashboardIntelligenceState {
    /** Computed insights from graph engine */
    insights: DiagnosticInsight[];

    /** Whether data is loading */
    isLoading: boolean;

    /** Whether graph engine is unavailable */
    isUnavailable: boolean;

    /** Error message if any */
    errorMessage: string | null;

    /** Response time from the bus */
    responseTimeMs: number | undefined;
}

// =============================================================================
// Hook
// =============================================================================

export function useDashboardIntelligence(): DashboardIntelligenceState {
    const {
        diagnosticResults,
        engineResults,
        isLoading,
        error,
        responseTimeMs,
    } = useDashboardDiagnostics(true);

    // Check if graph engine is available
    const graphEngine = engineResults.find((e: { engine: string }) => e.engine === "graph");
    const isUnavailable = graphEngine?.status !== "ok";
    const errorMessage = graphEngine?.error_message || error?.message || null;

    // Transform unified search results into dashboard-friendly format
    const insights = useMemo<DiagnosticInsight[]>(() => {
        if (isUnavailable || diagnosticResults.length === 0) {
            return [];
        }

        return diagnosticResults.map((result: UnifiedSearchResult) => {
            const signals = result.signals as Record<string, unknown>;
            const scores = result.scores;

            // Determine trend from signals
            let trend: "up" | "down" | "neutral" = "neutral";
            if (signals.trend === "improving") trend = "up";
            else if (signals.trend === "declining") trend = "down";

            return {
                id: String(result.id.id),
                conceptName: result.title,
                mastery: scores.mastery ?? 0,
                stability: scores.stability ?? 0.5,
                volatility: scores.volatility ?? 0.5,
                trend,
                isWeakArea: signals.is_weak_area === true,
                isFragile: signals.is_fragile === true,
                confidence: result.confidence,
                lastUpdated: result.valid_at,
            };
        });
    }, [diagnosticResults, isUnavailable]);

    return {
        insights,
        isLoading,
        isUnavailable,
        errorMessage,
        responseTimeMs,
    };
}
