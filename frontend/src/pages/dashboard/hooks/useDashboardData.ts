import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
    AnalyticsService,
    FlashcardsService,
    NotesService,
    DocumentsService,
    ChatService,
    QuizzesService,
} from '@/api/generated';
import type { DashboardData } from '../types/dashboard.types';

/**
 * Main data orchestrator hook
 * Fetches all dashboard data in parallel
 * 
 * NOTE: The @hey-api/client-fetch returns { data, request, response }
 * We need to extract .data from each response
 */
export function useDashboardData() {
    // Overview statistics
    const overviewQuery = useQuery({
        queryKey: queryKeys.analytics.overview(),
        queryFn: () => AnalyticsService.getOverviewApiV1AnalyticsOverviewGet(),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Weak areas analysis
    const weakAreasQuery = useQuery({
        queryKey: queryKeys.analytics.weakAreas(),
        queryFn: () => AnalyticsService.getWeakAreasApiV1AnalyticsWeakAreasGet(10),
        staleTime: 1000 * 60 * 10, // 10 minutes
    });

    // Performance trends (last 30 days)
    const performanceQuery = useQuery({
        queryKey: queryKeys.analytics.performance(30),
        queryFn: () => AnalyticsService.getPerformanceApiV1AnalyticsPerformanceGet(30),
        staleTime: 1000 * 60 * 10,
    });

    // Activity heatmap (last 365 days)
    const heatmapQuery = useQuery({
        queryKey: queryKeys.analytics.heatmap(365),
        queryFn: () => AnalyticsService.getHeatmapApiV1AnalyticsHeatmapGet(365),
        staleTime: 1000 * 60 * 30, // 30 minutes
    });

    // Due flashcards
    const dueCardsQuery = useQuery({
        queryKey: queryKeys.flashcards.due(),
        queryFn: () => FlashcardsService.getDueCardsApiV1CardsDueGet(50),
        staleTime: 1000 * 60 * 2, // 2 minutes
    });

    // Notes (for knowledge graph)
    const notesQuery = useQuery({
        queryKey: queryKeys.notes.lists(),
        queryFn: () => NotesService.listNotesApiV1NotesGet(undefined, undefined, 1, 100),
        staleTime: 1000 * 60 * 5,
    });

    // Documents (for knowledge graph)
    const documentsQuery = useQuery({
        queryKey: queryKeys.documents.lists(),
        queryFn: () => DocumentsService.listDocumentsApiV1DocumentsGet(),
        staleTime: 1000 * 60 * 5,
    });

    // Chat sessions (for knowledge graph)
    const chatSessionsQuery = useQuery({
        queryKey: queryKeys.chat.sessions(),
        queryFn: () => ChatService.listSessionsApiV1ChatSessionsGet(1, 50),
        staleTime: 1000 * 60 * 5,
    });

    // Quizzes (for knowledge graph)
    const quizzesQuery = useQuery({
        queryKey: queryKeys.quizzes.lists(),
        queryFn: () => QuizzesService.listQuizzesApiV1QuizzesGet(1, 50),
        staleTime: 1000 * 60 * 5,
    });

    // Aggregate loading state
    const isLoading =
        overviewQuery.isLoading ||
        weakAreasQuery.isLoading ||
        performanceQuery.isLoading ||
        heatmapQuery.isLoading ||
        dueCardsQuery.isLoading ||
        notesQuery.isLoading ||
        documentsQuery.isLoading ||
        chatSessionsQuery.isLoading ||
        quizzesQuery.isLoading;

    // Aggregate error state
    const error =
        overviewQuery.error ||
        weakAreasQuery.error ||
        performanceQuery.error ||
        heatmapQuery.error ||
        dueCardsQuery.error ||
        notesQuery.error ||
        documentsQuery.error ||
        chatSessionsQuery.error ||
        quizzesQuery.error;

    // Aggregate data
    const data: DashboardData | undefined = isLoading
        ? undefined
        : {
            overview: overviewQuery.data || null,
            weakAreas: weakAreasQuery.data || [],
            performance: performanceQuery.data || [],
            heatmap: heatmapQuery.data || [],
            dueCards: dueCardsQuery.data || [],
            notes: notesQuery.data || [],
            documents: documentsQuery.data || [],
            chatSessions: chatSessionsQuery.data || [],
            quizzes: quizzesQuery.data || [],
        };

    return {
        data,
        isLoading,
        error,
        refetch: () => {
            overviewQuery.refetch();
            weakAreasQuery.refetch();
            performanceQuery.refetch();
            heatmapQuery.refetch();
            dueCardsQuery.refetch();
            notesQuery.refetch();
            documentsQuery.refetch();
            chatSessionsQuery.refetch();
            quizzesQuery.refetch();
        },
    };
}
