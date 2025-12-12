import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
    getOverviewApiV1AnalyticsOverviewGet,
    getWeakAreasApiV1AnalyticsWeakAreasGet,
    getPerformanceApiV1AnalyticsPerformanceGet,
    getHeatmapApiV1AnalyticsHeatmapGet,
    getDueCardsApiV1CardsDueGet,
    listNotesApiV1NotesGet,
    listDocumentsApiV1DocumentsGet,
    listSessionsApiV1ChatSessionsGet,
    listQuizzesApiV1QuizzesGet,
} from '@/api/generated/services.gen';
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
        queryFn: async () => {
            const response = await getOverviewApiV1AnalyticsOverviewGet();
            return (response as any).data ?? response;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Weak areas analysis
    const weakAreasQuery = useQuery({
        queryKey: queryKeys.analytics.weakAreas(),
        queryFn: async () => {
            const response = await getWeakAreasApiV1AnalyticsWeakAreasGet({ query: { limit: 10 } });
            return (response as any).data ?? response;
        },
        staleTime: 1000 * 60 * 10, // 10 minutes
    });

    // Performance trends (last 30 days)
    const performanceQuery = useQuery({
        queryKey: queryKeys.analytics.performance(30),
        queryFn: async () => {
            const response = await getPerformanceApiV1AnalyticsPerformanceGet({ query: { days: 30 } });
            return (response as any).data ?? response;
        },
        staleTime: 1000 * 60 * 10,
    });

    // Activity heatmap (last 365 days)
    const heatmapQuery = useQuery({
        queryKey: queryKeys.analytics.heatmap(365),
        queryFn: async () => {
            const response = await getHeatmapApiV1AnalyticsHeatmapGet({ query: { days: 365 } });
            return (response as any).data ?? response;
        },
        staleTime: 1000 * 60 * 30, // 30 minutes
    });

    // Due flashcards
    const dueCardsQuery = useQuery({
        queryKey: queryKeys.flashcards.due(),
        queryFn: async () => {
            const response = await getDueCardsApiV1CardsDueGet({ query: { limit: 50 } });
            return (response as any).data ?? response;
        },
        staleTime: 1000 * 60 * 2, // 2 minutes
    });

    // Notes (for knowledge graph)
    const notesQuery = useQuery({
        queryKey: queryKeys.notes.lists(),
        queryFn: async () => {
            const response = await listNotesApiV1NotesGet({ query: { page_size: 100 } });
            return (response as any).data ?? response;
        },
        staleTime: 1000 * 60 * 5,
    });

    // Documents (for knowledge graph)
    const documentsQuery = useQuery({
        queryKey: queryKeys.documents.lists(),
        queryFn: async () => {
            const response = await listDocumentsApiV1DocumentsGet({ query: { page_size: 100 } });
            return (response as any).data ?? response;
        },
        staleTime: 1000 * 60 * 5,
    });

    // Chat sessions (for knowledge graph)
    const chatSessionsQuery = useQuery({
        queryKey: queryKeys.chat.sessions(),
        queryFn: async () => {
            const response = await listSessionsApiV1ChatSessionsGet({ query: { page_size: 50 } });
            return (response as any).data ?? response;
        },
        staleTime: 1000 * 60 * 5,
    });

    // Quizzes (for knowledge graph)
    const quizzesQuery = useQuery({
        queryKey: queryKeys.quizzes.lists(),
        queryFn: async () => {
            const response = await listQuizzesApiV1QuizzesGet({ query: { page_size: 50 } });
            return (response as any).data ?? response;
        },
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
