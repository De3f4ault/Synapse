/**
 * useUnifiedSearch Hook
 * 
 * React Query hook for the Search Intelligence Bus.
 * Designed for CMD+K, Dashboard, and Chat consumption.
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { unifiedSearch } from './client';
import { filterForCmdK, filterForDashboard, filterForChat } from './contract';
import type {
    UnifiedSearchResponse,
    UnifiedSearchResult,
    SearchIntent,
    SearchSurface,
    EngineResult,
} from './types';

// =============================================================================
// Query Keys
// =============================================================================

export const unifiedSearchKeys = {
    all: ['unified-search'] as const,
    search: (query: string, intent: SearchIntent, surface: SearchSurface) =>
        [...unifiedSearchKeys.all, query, intent, surface] as const,
};

// =============================================================================
// Hook Options
// =============================================================================

interface UseUnifiedSearchOptions {
    query: string;
    intent: SearchIntent;
    surface: SearchSurface;
    enabled?: boolean;
    maxLatencyMs?: number;
    maxResultsPerEngine?: number;
}

interface UseUnifiedSearchReturn {
    /** Full response from the bus */
    response: UnifiedSearchResponse | undefined;

    /** All results from all engines, flattened */
    allResults: UnifiedSearchResult[];

    /** Results filtered for CMD+K (navigation + diagnostic, factual only) */
    navigationResults: UnifiedSearchResult[];

    /** Results filtered for Dashboard (diagnostic + suggestion) */
    diagnosticResults: UnifiedSearchResult[];

    /** Results filtered for Chat (evidence only) */
    evidenceResults: UnifiedSearchResult[];

    /** Per-engine results for debugging/display */
    engineResults: EngineResult[];

    /** Loading state */
    isLoading: boolean;

    /** Error state */
    error: Error | null;

    /** Whether any engine failed */
    hasPartialFailure: boolean;

    /** Response time in ms */
    responseTimeMs: number | undefined;
}

// =============================================================================
// Main Hook
// =============================================================================

export function useUnifiedSearch(
    options: UseUnifiedSearchOptions,
    queryOptions?: Omit<UseQueryOptions<UnifiedSearchResponse>, 'queryKey' | 'queryFn'>
): UseUnifiedSearchReturn {
    const {
        query,
        intent,
        surface,
        enabled = true,
        maxLatencyMs = 200,
        maxResultsPerEngine = 20,
    } = options;

    const queryResult = useQuery({
        queryKey: unifiedSearchKeys.search(query, intent, surface),
        queryFn: () =>
            unifiedSearch({
                query,
                intent,
                surface,
                max_latency_ms: maxLatencyMs,
                max_results_per_engine: maxResultsPerEngine,
            }),
        enabled: enabled && query.length >= 2,
        staleTime: 1000 * 30, // 30 seconds
        ...queryOptions,
    });

    const response = queryResult.data;
    const engineResults = response?.engines ?? [];

    // Flatten all results from all engines
    const allResults = engineResults.flatMap((e) => e.results);

    // Apply consumer-specific filters with contract enforcement
    const navigationResults = filterForCmdK(allResults);
    const diagnosticResults = filterForDashboard(allResults);
    const evidenceResults = filterForChat(allResults);

    // Check for partial failures
    const hasPartialFailure = engineResults.some(
        (e) => e.status !== 'ok' && engineResults.some((e2) => e2.status === 'ok')
    );

    return {
        response,
        allResults,
        navigationResults,
        diagnosticResults,
        evidenceResults,
        engineResults,
        isLoading: queryResult.isLoading,
        error: queryResult.error as Error | null,
        hasPartialFailure,
        responseTimeMs: response?.response_time_ms,
    };
}

// =============================================================================
// Specialized Hooks (Convenience Wrappers)
// =============================================================================

/**
 * Hook optimized for CMD+K navigation.
 * Uses intent=navigate, surface=cmdk.
 */
export function useCmdKSearch(
    query: string,
    enabled: boolean = true
): UseUnifiedSearchReturn {
    return useUnifiedSearch({
        query,
        intent: 'navigate',
        surface: 'cmdk',
        enabled,
        maxLatencyMs: 2000, // Hybrid search needs time for embeddings + BM25 + vector
        maxResultsPerEngine: 10,
    });
}

/**
 * Hook optimized for Dashboard diagnostics.
 * Uses intent=diagnose, surface=dashboard.
 */
export function useDashboardDiagnostics(
    enabled: boolean = true
): UseUnifiedSearchReturn {
    return useUnifiedSearch({
        query: '', // Diagnostic doesn't need a query
        intent: 'diagnose',
        surface: 'dashboard',
        enabled,
        maxLatencyMs: 300, // Dashboard can be slightly slower
        maxResultsPerEngine: 20,
    });
}

/**
 * Hook optimized for Chat context retrieval.
 * Uses intent=retrieve_context, surface=chat.
 */
export function useChatContext(
    query: string,
    enabled: boolean = true
): UseUnifiedSearchReturn {
    return useUnifiedSearch({
        query,
        intent: 'retrieve_context',
        surface: 'chat',
        enabled,
        maxLatencyMs: 500, // RAG can take longer
        maxResultsPerEngine: 30,
    });
}
