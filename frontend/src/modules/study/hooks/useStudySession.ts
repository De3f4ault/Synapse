import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    StudyService,
} from '@/api/generated';
import { QUERY_KEYS } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import type { StudySessionCreate, StudySessionResponse } from '@/api/generated';

/**
 * Hook for managing study sessions
 * Handles session lifecycle and statistics tracking
 */

interface UseStudySessionOptions {
    onComplete?: (session: StudySessionResponse) => void;
}

export function useStudySession(options: UseStudySessionOptions = {}) {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Start session mutation
    const { mutate: startSession, isPending: isStarting } = useMutation({
        mutationFn: (data: StudySessionCreate) =>
            startSessionApiV1StudySessionsPost({ requestBody: data }),
        onSuccess: (result) => {
            // Start session
            const startSessionMutation = useMutation({
                mutationFn: async (config: StudySessionConfig) => {
                    const response = await StudyService.startSessionApiV1StudySessionsPost({
                        items: config.items.map(i => i.id),
                        session_type: config.type,
                    });
                    return response;
                },
                onSuccess: (data) => {
                    setSessionId(data.id);
                    setSessionState({
                        sessionId: data.id,
                        config: sessionState.config,
                        currentItemIndex: 0,
                        completedItems: [],
                        startTime: new Date(),
                        stats: {
                            totalItems: sessionState.config.items.length,
                            completedItems: 0,
                            correctItems: 0,
                            accuracy: 0,
                            timeSpent: 0,
                            averageTimePerItem: 0,
                        },
                    });
                },
            });

            // Complete session
            const completeSessionMutation = useMutation({
                mutationFn: async () => {
                    if (!sessionId) return;
                    const response = await StudyService.completeSessionApiV1StudySessionsSessionIdCompletePost(sessionId);
                    return response;
                },
                onSuccess: (data) => {
                    // Handle completion
                },
            }); const minutes = Math.floor(result.time_spent_seconds / 60);
            const accuracy = (result.accuracy * 100).toFixed(1);

            toast({
                title: 'Session Complete!',
                description: `${result.items_completed} items in ${minutes}m · ${accuracy}% accuracy`,
            });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STUDY] });
            options.onComplete?.(result);
            return result;
        },
        onError: (error) => {
            toast({
                title: 'Failed to Complete Session',
                description: error instanceof Error ? error.message : 'An error occurred',
                variant: 'destructive',
            });
        },
    });

    // Calculate session statistics
    const calculateStats = (session: StudySessionResponse) => {
        const minutes = Math.floor(session.time_spent_seconds / 60);
        const seconds = session.time_spent_seconds % 60;
        const timeFormatted = `${minutes}m ${seconds}s`;

        const itemsPerMinute = minutes > 0
            ? (session.items_completed / minutes).toFixed(1)
            : '0';

        const accuracyPercent = (session.accuracy * 100).toFixed(1);

        return {
            timeFormatted,
            itemsPerMinute,
            accuracyPercent,
            isGoodAccuracy: session.accuracy >= 0.8,
            isExcellentAccuracy: session.accuracy >= 0.9,
        };
    };

    return {
        startSession,
        completeSession,
        isStarting,
        isCompleting,
        calculateStats,
    };
}
