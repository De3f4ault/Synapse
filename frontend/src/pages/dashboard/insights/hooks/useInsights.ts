/**
 * useInsights - Orchestrating intelligence insights
 * 
 * Fetches necessary data and computes insights using the engine.
 * Integrates API weak areas with graph-based WEAKNESS edges.
 * Integrates GIE (Graph Intelligence Engine) for mastery/stability data.
 * Caches results in Zustand store.
 */

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
    AnalyticsService,
    FlashcardsService,
    NotesService,
    DocumentsService,
    QuizzesService,
} from "@/api/generated";
import {
    computeWeakAreas,
    mergeWeakAreas,
    mergeGIEWeakAreas,
    suggestNextAction,
    generateMilestones,
    generateContextInsights,
    type DashboardDataInput,
} from "../engine";
import { useInsightsStore, useInsightsActions } from "../state";
import { useGraphWeakConcepts } from "./useGraphWeakConcepts";
import { useIntelligence } from "@/pages/study/hooks/useIntelligence";

export function useInsights() {
    const { setAll, setComputing, setError } = useInsightsActions();
    const lastComputedAt = useInsightsStore((s) => s.lastComputedAt);

    // Graph-based weak concepts (from spaced repetition)
    const { weakAreas: graphWeakAreas } = useGraphWeakConcepts();

    // GIE intelligence data (mastery + stability)
    const { data: gieData, isLoading: isGIELoading } = useIntelligence(5);

    // ===========================================================================
    // Data Fetching
    // Insights engine needs a holistic view of the system
    // ===========================================================================

    // Overview
    const overviewQuery = useQuery({
        queryKey: queryKeys.analytics.overview(),
        queryFn: () => AnalyticsService.getOverviewApiV1AnalyticsOverviewGet(),
        staleTime: 1000 * 60 * 5,
    });

    // Weak areas
    const weakAreasQuery = useQuery({
        queryKey: queryKeys.analytics.weakAreas(),
        queryFn: () => AnalyticsService.getWeakAreasApiV1AnalyticsWeakAreasGet(10),
        staleTime: 1000 * 60 * 10,
    });

    // Due flashcards
    const dueCardsQuery = useQuery({
        queryKey: queryKeys.flashcards.due(),
        queryFn: () => FlashcardsService.getDueCardsApiV1CardsDueGet(50),
        staleTime: 1000 * 60 * 2,
    });

    // Content for context
    const notesQuery = useQuery({
        queryKey: queryKeys.notes.lists(),
        queryFn: () => NotesService.listNotesApiV1NotesGet(undefined, undefined, undefined, undefined, 1, 100),
        staleTime: 1000 * 60 * 5,
    });

    const documentsQuery = useQuery({
        queryKey: queryKeys.documents.lists(),
        queryFn: () => DocumentsService.listDocumentsApiV1DocumentsGet(),
        staleTime: 1000 * 60 * 5,
    });

    const quizzesQuery = useQuery({
        queryKey: queryKeys.quizzes.lists(),
        queryFn: () => QuizzesService.listQuizzesApiV1QuizzesGet(1, 50),
        staleTime: 1000 * 60 * 5,
    });

    const isLoading =
        overviewQuery.isLoading ||
        weakAreasQuery.isLoading ||
        dueCardsQuery.isLoading ||
        notesQuery.isLoading ||
        documentsQuery.isLoading ||
        quizzesQuery.isLoading;

    const error =
        overviewQuery.error ||
        weakAreasQuery.error ||
        dueCardsQuery.error ||
        notesQuery.error ||
        documentsQuery.error ||
        quizzesQuery.error;

    // ===========================================================================
    // Computation
    // ===========================================================================

    // Prepare input for engine
    const engineInput = useMemo<DashboardDataInput | undefined>(() => {
        if (isLoading) return undefined;

        return {
            overview: overviewQuery.data || null,
            weakAreas: weakAreasQuery.data || [],
            dueCards: dueCardsQuery.data || [],
            documents: documentsQuery.data || [],
            notes: (notesQuery.data || []).map(n => ({
                id: n.id,
                title: n.title,
                // content is string | Record<string,any> from the API — engine only needs plain text
                content: typeof n.content === 'string' ? n.content : (n.content_text ?? undefined),
            })),
            quizzes: (quizzesQuery.data || []).map(q => ({
                ...q,
                time_limit_minutes: q.time_limit_minutes === null ? undefined : q.time_limit_minutes
            })),
        };
    }, [
        isLoading,
        overviewQuery.data,
        weakAreasQuery.data,
        dueCardsQuery.data,
        documentsQuery.data,
        notesQuery.data,
        quizzesQuery.data,
    ]);

    // Compute insights when data changes
    useEffect(() => {
        if (!engineInput) return;
        // Wait for GIE data too, but don't block entirely if it fails
        if (isGIELoading) return;

        // Skip if already computed recently (within 5 seconds)
        if (lastComputedAt && Date.now() - lastComputedAt < 5000) {
            return;
        }

        setComputing(true);

        try {
            // Execute pure engine functions
            // These are CPU-bound but fast enough for client-side

            // 1. Compute API-based weak areas
            const apiWeakAreas = computeWeakAreas(engineInput.weakAreas);

            // 2. Merge with graph-based weak areas
            // Graph weakness overrides API when both exist (hybrid)
            let weakAreas = mergeWeakAreas(apiWeakAreas, graphWeakAreas);

            // 3. Merge with GIE weak/fragile concepts (highest authority)
            if (gieData) {
                weakAreas = mergeGIEWeakAreas(
                    weakAreas,
                    gieData.weak_concepts || [],
                    gieData.fragile_concepts || []
                );
            }

            // 4. Generate other insights
            const nextAction = suggestNextAction(engineInput, weakAreas);
            const milestones = generateMilestones(engineInput.overview);
            const contextInsights = generateContextInsights(engineInput, weakAreas);

            // Update store
            setAll({
                weakAreas,
                nextAction,
                milestones,
                contextInsights,
            });
        } catch (err) {
            console.error("[useInsights] Computation error:", err);
            setError(err instanceof Error ? err : new Error("Failed to compute insights"));
        }
    }, [engineInput, graphWeakAreas, gieData, isGIELoading, lastComputedAt, setAll, setComputing, setError]);

    // Return store values + fetching status
    const store = useInsightsStore();

    return {
        // Computed insights
        weakAreas: store.weakAreas,
        nextAction: store.nextAction,
        milestones: store.milestones,
        contextInsights: store.contextInsights,

        // Status
        isLoading: isLoading || store.isComputing,
        error: error || store.error,

        // Actions
        refetch: () => {
            overviewQuery.refetch();
            weakAreasQuery.refetch();
            dueCardsQuery.refetch();
            notesQuery.refetch();
            documentsQuery.refetch();
            quizzesQuery.refetch();
        },
    };
}
