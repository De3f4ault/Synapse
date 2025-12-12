import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    startSessionApiV1StudySessionsPost,
    completeSessionApiV1StudySessionsSessionIdCompletePost,
} from '@/api/generated/services.gen';
import { QUERY_KEYS } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import type { StudySessionCreate, StudySessionResponse } from '@/api/generated/types.gen';

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
                                                                            toast({
                                                                                title: 'Study Session Started',
                                                                                description: `${result.session_type} session started`,
                                                                            });
                                                                            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STUDY] });
                                                                            return result;
                                                                        },
                                                                        onError: (error) => {
                                                                            toast({
                                                                                title: 'Failed to Start Session',
                                                                                description: error instanceof Error ? error.message : 'An error occurred',
                                                                                variant: 'destructive',
                                                                            });
                                                                        },
    });

    // Complete session mutation
    const { mutate: completeSession, isPending: isCompleting } = useMutation({
        mutationFn: (sessionId: number) =>
        completeSessionApiV1StudySessionsSessionIdCompletePost({ sessionId }),
                                                                             onSuccess: (result) => {
                                                                                 const minutes = Math.floor(result.time_spent_seconds / 60);
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
