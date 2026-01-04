/**
 * useQuizAttempt - Quiz Attempt FSM Hook
 *
 * Finite state machine for managing active quiz attempts.
 * This is the single source of truth for attempt state.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QuizzesService } from "@/api/generated";
import { queryKeys } from "@/lib/queryKeys";
import type {
    QuizAttemptStart,
    AnswerSubmit,
    QuizResultResponse,
} from "@/api/generated";
import {
    QuizAttemptState,
    assertTransition,
    type QuizId,
    type LocalQuestionState,
} from "../../core";

// ============================================================================
// Types
// ============================================================================

interface AttemptHookState {
    state: QuizAttemptState;
    attemptData: QuizAttemptStart | null;
    currentIndex: number;
    questionStates: Map<number, LocalQuestionState>;
    startTime: number;
    elapsedTime: number;
    results: QuizResultResponse | null;
    error: string | null;
}

interface AttemptHookActions {
    answer: (questionId: number, selectedOption: string, correctAnswer: string) => void;
    goToQuestion: (index: number) => void;
    next: () => void;
    previous: () => void;
    submit: () => void;
    reset: () => void;
}

type UseQuizAttemptReturn = AttemptHookState & AttemptHookActions;

// ============================================================================
// Initial State
// ============================================================================

const createInitialState = (): AttemptHookState => ({
    state: QuizAttemptState.IDLE,
    attemptData: null,
    currentIndex: 0,
    questionStates: new Map(),
    startTime: Date.now(),
    elapsedTime: 0,
    results: null,
    error: null,
});

// ============================================================================
// Hook Implementation
// ============================================================================

export function useQuizAttempt(quizId: QuizId): UseQuizAttemptReturn {
    const queryClient = useQueryClient();
    const [hookState, setHookState] = useState<AttemptHookState>(createInitialState());

    // Timer ref
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // =========================================================================
    // State Transition Helper
    // =========================================================================

    const transition = useCallback((to: QuizAttemptState) => {
        setHookState((prev) => {
            try {
                assertTransition(prev.state, to);
                return { ...prev, state: to };
            } catch (err) {
                console.error("Invalid state transition:", err);
                return prev;
            }
        });
    }, []);

    // =========================================================================
    // Timer
    // =========================================================================

    useEffect(() => {
        if (hookState.state === QuizAttemptState.ACTIVE) {
            timerRef.current = setInterval(() => {
                setHookState((prev) => ({
                    ...prev,
                    elapsedTime: Math.floor((Date.now() - prev.startTime) / 1000),
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
    }, [hookState.state]);

    // =========================================================================
    // Mutations
    // =========================================================================

    const startMutation = useMutation({
        mutationFn: () =>
            QuizzesService.startQuizAttemptApiV1QuizzesQuizIdStartPost(quizId),
        onSuccess: (data) => {
            setHookState((prev) => ({
                ...prev,
                state: QuizAttemptState.ACTIVE,
                attemptData: data,
                startTime: Date.now(),
                elapsedTime: 0,
            }));
        },
        onError: (error: Error) => {
            setHookState((prev) => ({
                ...prev,
                state: QuizAttemptState.ERROR,
                error: error.message,
            }));
            toast.error("Failed to start quiz", { description: error.message });
        },
    });

    const submitMutation = useMutation({
        mutationFn: (answers: AnswerSubmit[]) => {
            if (!hookState.attemptData) {
                throw new Error("No attempt data");
            }
            return QuizzesService.submitQuizAttemptApiV1QuizzesAttemptsAttemptIdSubmitPost(
                hookState.attemptData.attempt_id,
                answers
            );
        },
        onSuccess: (data) => {
            setHookState((prev) => ({
                ...prev,
                state: QuizAttemptState.COMPLETED,
                results: data,
            }));
            queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all });
        },
        onError: (error: Error) => {
            setHookState((prev) => ({
                ...prev,
                state: QuizAttemptState.ACTIVE, // Go back to active on error
                error: error.message,
            }));
            toast.error("Failed to submit quiz", { description: error.message });
        },
    });

    // =========================================================================
    // Auto-start or Resume on mount
    // =========================================================================

    // Guard against double-initialization (React StrictMode)
    const initStartedRef = useRef(false);

    useEffect(() => {
        if (!quizId || hookState.state !== QuizAttemptState.IDLE) return;
        if (initStartedRef.current) return; // Already started
        initStartedRef.current = true;

        const initAttempt = async () => {
            transition(QuizAttemptState.LOADING);

            try {
                // Check for existing active attempt
                const activeAttemptId =
                    await QuizzesService.getActiveAttemptApiV1QuizzesQuizIdActiveGet(quizId);

                if (activeAttemptId) {
                    // Resume existing attempt
                    transition(QuizAttemptState.RESUMING);

                    const resumeData =
                        await QuizzesService.resumeQuizAttemptApiV1QuizzesAttemptsAttemptIdResumeGet(
                            activeAttemptId
                        );

                    // Check if expired
                    if (resumeData.is_expired) {
                        toast.warning("Quiz expired", {
                            description: "Time limit exceeded. Starting fresh.",
                        });
                        // Start fresh
                        startMutation.mutate();
                        return;
                    }

                    // Rehydrate state from resume data
                    const questionStates = new Map<number, LocalQuestionState>();
                    for (const partial of resumeData.partial_answers) {
                        // Find the question to get correct answer
                        const question = resumeData.questions.find(
                            (q) => q.id === partial.question_id
                        );
                        if (question) {
                            const isCorrect =
                                partial.answer.toLowerCase().trim() ===
                                question.correct_answer.toLowerCase().trim();
                            questionStates.set(partial.question_id, {
                                answered: true,
                                selectedAnswer: partial.answer,
                                isCorrect,
                                showExplanation: true,
                            });
                        }
                    }

                    // Calculate start time based on elapsed time
                    const startTime = Date.now() - resumeData.elapsed_seconds * 1000;

                    setHookState((prev) => ({
                        ...prev,
                        state: QuizAttemptState.ACTIVE,
                        attemptData: {
                            attempt_id: resumeData.attempt_id,
                            quiz_id: resumeData.quiz_id,
                            started_at: resumeData.started_at,
                            questions: resumeData.questions,
                        },
                        currentIndex: resumeData.current_question_index,
                        questionStates,
                        startTime,
                        elapsedTime: resumeData.elapsed_seconds,
                    }));

                    toast.success("Quiz resumed", {
                        description: `Continuing from question ${resumeData.current_question_index + 1}`,
                    });
                } else {
                    // Start new attempt
                    startMutation.mutate();
                }
            } catch (error) {
                console.error("Failed to init attempt:", error);
                // On error, try starting fresh
                startMutation.mutate();
            }
        };

        initAttempt();
    }, [quizId]);

    // =========================================================================
    // Actions
    // =========================================================================

    const answer = useCallback(
        (questionId: number, selectedOption: string, correctAnswer: string) => {
            const isCorrect =
                selectedOption.toLowerCase().trim() === correctAnswer.toLowerCase().trim();

            setHookState((prev) => {
                const newMap = new Map(prev.questionStates);
                newMap.set(questionId, {
                    answered: true,
                    selectedAnswer: selectedOption,
                    isCorrect,
                    showExplanation: true,
                });
                return { ...prev, questionStates: newMap };
            });
        },
        []
    );

    const goToQuestion = useCallback((index: number) => {
        setHookState((prev) => {
            const totalQuestions = prev.attemptData?.questions.length ?? 0;
            if (index >= 0 && index < totalQuestions) {
                return { ...prev, currentIndex: index };
            }
            return prev;
        });
    }, []);

    const next = useCallback(() => {
        setHookState((prev) => {
            const totalQuestions = prev.attemptData?.questions.length ?? 0;
            if (prev.currentIndex < totalQuestions - 1) {
                return { ...prev, currentIndex: prev.currentIndex + 1 };
            }
            return prev;
        });
    }, []);

    const previous = useCallback(() => {
        setHookState((prev) => {
            if (prev.currentIndex > 0) {
                return { ...prev, currentIndex: prev.currentIndex - 1 };
            }
            return prev;
        });
    }, []);

    const submit = useCallback(() => {
        if (hookState.state !== QuizAttemptState.ACTIVE) return;

        // Build answers array from question states
        const answersArray: AnswerSubmit[] = [];
        hookState.questionStates.forEach((state, questionId) => {
            if (state.selectedAnswer) {
                answersArray.push({
                    question_id: questionId,
                    answer: state.selectedAnswer,
                });
            }
        });

        transition(QuizAttemptState.SUBMITTING);
        submitMutation.mutate(answersArray);
    }, [hookState.state, hookState.questionStates, transition, submitMutation]);

    const reset = useCallback(() => {
        setHookState(createInitialState());
    }, []);

    // =========================================================================
    // Return
    // =========================================================================

    return {
        // State
        state: hookState.state,
        attemptData: hookState.attemptData,
        currentIndex: hookState.currentIndex,
        questionStates: hookState.questionStates,
        startTime: hookState.startTime,
        elapsedTime: hookState.elapsedTime,
        results: hookState.results,
        error: hookState.error,

        // Actions
        answer,
        goToQuestion,
        next,
        previous,
        submit,
        reset,
    };
}
