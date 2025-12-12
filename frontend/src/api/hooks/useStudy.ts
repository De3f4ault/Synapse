// Study hooks using TanStack Query
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    getDueItemsApiV1StudyDueGet,
    startSessionApiV1StudySessionsPost,
    listSessionsApiV1StudySessionsGet,
    getSessionApiV1StudySessionsSessionIdGet,
    completeSessionApiV1StudySessionsSessionIdCompletePost,
    getRecommendationsApiV1StudyRecommendationsGet,
} from '../generated/services.gen';
import type {
    StudyItemResponse,
    StudySessionResponse,
    StudySessionCreate,
} from '../generated/types.gen';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Hook to get due items across modules
 */
export const useDueItems = (params?: { modules?: string; limit?: number }) => {
    return useQuery<StudyItemResponse[]>({
        queryKey: queryKeys.study.due(),
                                         queryFn: () => getDueItemsApiV1StudyDueGet(params || {}),
    });
};

/**
 * Hook to get AI-powered study recommendations
 */
export const useStudyRecommendations = (limit?: number) => {
    return useQuery<StudyItemResponse[]>({
        queryKey: queryKeys.study.recommendations(),
                                         queryFn: () => getRecommendationsApiV1StudyRecommendationsGet({ limit }),
    });
};

/**
 * Hook to list study sessions
 */
export const useStudySessions = (params?: {
    page?: number;
    pageSize?: number;
}) => {
    return useQuery<StudySessionResponse[]>({
        queryKey: queryKeys.study.sessions(),
                                            queryFn: () => listSessionsApiV1StudySessionsGet(params || {}),
    });
};

/**
 * Hook to get a specific study session
 */
export const useStudySession = (sessionId: number) => {
    return useQuery<StudySessionResponse>({
        queryKey: queryKeys.study.session(sessionId),
                                          queryFn: () => getSessionApiV1StudySessionsSessionIdGet({ sessionId }),
                                          enabled: !!sessionId,
    });
};

/**
 * Hook to start a new study session
 */
export const useStartStudySession = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: StudySessionCreate) =>
        startSessionApiV1StudySessionsPost({ requestBody: data }),
                       onSuccess: () => {
                           queryClient.invalidateQueries({ queryKey: queryKeys.study.sessions() });
                       },
    });
};

/**
 * Hook to complete a study session
 */
export const useCompleteStudySession = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (sessionId: number) =>
        completeSessionApiV1StudySessionsSessionIdCompletePost({ sessionId }),
                       onSuccess: (_, sessionId) => {
                           queryClient.invalidateQueries({ queryKey: queryKeys.study.sessions() });
                           queryClient.invalidateQueries({
                               queryKey: queryKeys.study.session(sessionId),
                           });
                           queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
                       },
    });
};
