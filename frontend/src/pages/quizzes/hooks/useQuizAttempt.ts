import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    startQuizAttemptApiV1QuizzesQuizIdStartPost,
    submitQuizAttemptApiV1QuizzesAttemptsAttemptIdSubmitPost,
} from '@/api/generated/services.gen';
import { queryKeys } from '@/lib/queryKeys';
import type { AnswerSubmit } from '@/api/generated/types.gen';
import type { GameState, QuizAttemptState } from '../types/quizzes.types';

/**
 * Custom hook for managing quiz attempt state
 */
export function useQuizAttempt(quizId: number) {
    const queryClient = useQueryClient();

    const [state, setState] = useState<QuizAttemptState>({
        attemptData: null,
        currentIdx: 0,
        answers: new Map(),
                                                         streak: 0,
                                                         maxStreak: 0,
                                                         startTime: Date.now(),
                                                         elapsedTime: 0,
    });

    const [gameState, setGameState] = useState<GameState>('LOADING');
    const [selectedOption, setSelectedOption] = useState<string | null>(null);

    // Timer
    useEffect(() => {
        if (gameState === 'ACTIVE' || gameState === 'REVIEW') {
            const interval = setInterval(() => {
                setState((prev) => ({
                    ...prev,
                    elapsedTime: Math.floor((Date.now() - prev.startTime) / 1000),
                }));
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [gameState]);

    // Start attempt
    const { mutate: startAttempt } = useMutation({
        mutationFn: () => startQuizAttemptApiV1QuizzesQuizIdStartPost({ quizId }),
                                                 onSuccess: (data) => {
                                                     setState((prev) => ({ ...prev, attemptData: data }));
                                                     setGameState('ACTIVE');
                                                 },
                                                 onError: (error) => {
                                                     toast.error('CONNECTION SEVERED: UNABLE TO START SIMULATION', {
                                                         description: error instanceof Error ? error.message : 'Unknown error',
                                                     });
                                                 },
    });

    // Submit quiz
    const { mutate: submitQuiz, data: results } = useMutation({
        mutationFn: () => {
            if (!state.attemptData) throw new Error('No attempt data');
            const answersArray: AnswerSubmit[] = Array.from(state.answers.entries()).map(
                ([qId, ans]) => ({
                    question_id: qId,
                    answer: ans,
                })
            );
            return submitQuizAttemptApiV1QuizzesAttemptsAttemptIdSubmitPost({
                attemptId: state.attemptData.attempt_id,
                requestBody: answersArray,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all });
            setGameState('END');
        },
        onError: (error) => {
            toast.error('UPLOAD FAILED: DATA PACKET LOST', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        },
    });

    // Handle answer selection
    const handleAnswer = useCallback(
        (option: string) => {
            if (selectedOption !== null || !state.attemptData?.questions) return;

            setSelectedOption(option);
            const currentQ = state.attemptData.questions[state.currentIdx];

            // Store answer
            setState((prev) => ({
                ...prev,
                answers: new Map(prev.answers).set(currentQ.id, option),
                                streak: prev.streak + 1,
                                maxStreak: Math.max(prev.maxStreak, prev.streak + 1),
            }));

            // Move to review state
            setTimeout(() => setGameState('REVIEW'), 600);
        },
        [selectedOption, state.attemptData, state.currentIdx]
    );

    // Move to next question
    const nextQuestion = useCallback(() => {
        if (!state.attemptData?.questions) return;

        setSelectedOption(null);

        if (state.currentIdx < state.attemptData.questions.length - 1) {
            setState((prev) => ({ ...prev, currentIdx: prev.currentIdx + 1 }));
            setGameState('ACTIVE');
        } else {
            // Last question - submit
            submitQuiz();
        }
    }, [state.attemptData, state.currentIdx, submitQuiz]);

    // Initialize
    useEffect(() => {
        if (quizId && !state.attemptData) {
            startAttempt();
        }
    }, [quizId]);

    return {
        state,
        gameState,
        selectedOption,
        results,
        handleAnswer,
        nextQuestion,
        setGameState,
    };
}
