/**
 * useStudySession - Hook for managing active study sessions
 *
 * Handles session lifecycle, progress tracking, and API integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { StudyService, StudySessionType } from '@/api/generated';
import { QUERY_KEYS } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import type { StudyItem } from '../types/study.types';

interface UseStudySessionReturn {
    session: SessionState;
    currentItem: StudyItem | null;
    elapsedTime: number;
    progress: number;
    handleAnswer: (isCorrect: boolean) => void;
    handleSkip: () => void;
    pauseSession: () => void;
    resumeSession: () => void;
    cancelSession: () => void;
}

interface SessionState {
    id: number | null;
    status: 'active' | 'paused' | 'completed' | 'cancelled';
    currentIndex: number;
    items: StudyItem[];
    completedItems: Map<number, boolean>; // itemId -> wasCorrect
    startTime: Date;
    endTime: Date | null;
    stats: SessionStats;
}

interface SessionStats {
    totalItems: number;
    completedItems: number;
    correctItems: number;
    accuracy: number;
    timeSpent: number; // seconds
    streak: number;
}

export function useStudySession(items: StudyItem[]): UseStudySessionReturn {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Session state
    const [session, setSession] = useState<SessionState>({
        id: null,
        status: 'active',
        currentIndex: 0,
        items,
        completedItems: new Map(),
        startTime: new Date(),
        endTime: null,
        stats: {
            totalItems: items.length,
            completedItems: 0,
            correctItems: 0,
            accuracy: 0,
            timeSpent: 0,
            streak: 0,
        },
    });

    // Timer for elapsed time
    const [elapsedTime, setElapsedTime] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Start session mutation
    const startSessionMutation = useMutation({
        mutationFn: () => StudyService.startSessionApiV1StudySessionsPost({
            session_type: StudySessionType.MIXED,
            modules: ['flashcards', 'quizzes'],
        }),
        onSuccess: (result: any) => {
            setSession(prev => ({ ...prev, id: result.id }));
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
    const completeSessionMutation = useMutation({
        mutationFn: (sessionId: number) =>
            StudyService.completeSessionApiV1StudySessionsSessionIdCompletePost(sessionId),
        onSuccess: (result) => {
            const minutes = Math.floor(result.time_spent_seconds / 60);
            const accuracy = (result.accuracy * 100).toFixed(1);

            toast({
                title: 'Session Complete!',
                description: `${result.items_completed} items in ${minutes}m · ${accuracy}% accuracy`,
            });

            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STUDY.DUE });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STUDY.RECOMMENDATIONS });
        },
    });

    // Start session on mount
    useEffect(() => {
        startSessionMutation.mutate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Timer effect
    useEffect(() => {
        if (session.status === 'active') {
            timerRef.current = setInterval(() => {
                setElapsedTime(prev => prev + 1);
                setSession(prev => ({
                    ...prev,
                    stats: {
                        ...prev.stats,
                        timeSpent: prev.stats.timeSpent + 1,
                    },
                }));
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [session.status]);

    // Handle answer
    const handleAnswer = useCallback((isCorrect: boolean) => {
        setSession(prev => {
            const currentItem = prev.items[prev.currentIndex];
            if (!currentItem) return prev;

            const newCompletedItems = new Map(prev.completedItems);
            newCompletedItems.set(currentItem.id, isCorrect);

            const completedCount = newCompletedItems.size;
            const correctCount = Array.from(newCompletedItems.values()).filter(Boolean).length;
            const accuracy = completedCount > 0 ? (correctCount / completedCount) * 100 : 0;

            const newStreak = isCorrect ? prev.stats.streak + 1 : 0;
            const nextIndex = prev.currentIndex + 1;

            // Check if session is complete
            if (nextIndex >= prev.items.length) {
                const endTime = new Date();
                const newState = {
                    ...prev,
                    status: 'completed' as const,
                    endTime,
                    completedItems: newCompletedItems,
                    stats: {
                        totalItems: prev.items.length,
                        completedItems: completedCount,
                        correctItems: correctCount,
                        accuracy,
                        timeSpent: prev.stats.timeSpent,
                        streak: newStreak,
                    },
                };

                // Complete session on backend
                if (prev.id) {
                    completeSessionMutation.mutate(prev.id);
                }

                return newState;
            }

            return {
                ...prev,
                currentIndex: nextIndex,
                completedItems: newCompletedItems,
                stats: {
                    ...prev.stats,
                    completedItems: completedCount,
                    correctItems: correctCount,
                    accuracy,
                    streak: newStreak,
                },
            };
        });
    }, [completeSessionMutation]);

    // Handle skip
    const handleSkip = useCallback(() => {
        setSession(prev => {
            const nextIndex = prev.currentIndex + 1;
            if (nextIndex >= prev.items.length) {
                return { ...prev, status: 'completed', endTime: new Date() };
            }
            return { ...prev, currentIndex: nextIndex, stats: { ...prev.stats, streak: 0 } };
        });
    }, []);

    // Pause session
    const pauseSession = useCallback(() => {
        setSession(prev => ({ ...prev, status: 'paused' }));
    }, []);

    // Resume session
    const resumeSession = useCallback(() => {
        setSession(prev => ({ ...prev, status: 'active' }));
    }, []);

    // Cancel session
    const cancelSession = useCallback(() => {
        setSession(prev => ({ ...prev, status: 'cancelled', endTime: new Date() }));
    }, []);

    // Calculate progress
    const progress = (session.currentIndex / items.length) * 100;

    // Get current item
    const currentItem = session.items[session.currentIndex] || null;

    return {
        session,
        currentItem,
        elapsedTime,
        progress,
        handleAnswer,
        handleSkip,
        pauseSession,
        resumeSession,
        cancelSession,
    };
}
