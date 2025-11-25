import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import {
    startQuizAttemptApiV1QuizzesQuizIdStartPost,
    submitQuizAttemptApiV1QuizzesAttemptsAttemptIdSubmitPost,
} from '../../api/generated/services.gen';
import type { QuizAttemptStart, AnswerSubmit } from '../../api/generated/types.gen';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { Badge } from '../../components/ui/badge';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Label } from '../../components/ui/label';
import {
    ArrowLeft,
    ArrowRight,
    Clock,
    Trophy,
    Flag,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

/**
 * Enhanced Quiz Take Page
 *
 * Features:
 * - Question navigation circles
 * - Timer countdown
 * - Flag for review
 * - Previous/Next navigation
 * - Submit confirmation
 * - Results summary with confetti
 */

interface Answer {
    questionId: number;
    answer: string;
    flagged: boolean;
}

export function QuizTakePage() {
    const { quizId } = useParams<{ quizId: string }>();
    const navigate = useNavigate();
    const id = parseInt(quizId || '0', 10);

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
    const [showResults, setShowResults] = useState(false);
    const [attemptData, setAttemptData] = useState<QuizAttemptStart | null>(null);

    // Start quiz attempt mutation
    const { mutate: startAttempt, isPending: isStarting } = useMutation({
        mutationFn: () => startQuizAttemptApiV1QuizzesQuizIdStartPost({ quizId: id }),
                                                                        onSuccess: (data) => {
                                                                            setAttemptData(data);
                                                                            // Note: time_limit_minutes is not in QuizAttemptStart, would need to be added to API
                                                                            // For now, we'll skip the timer
                                                                        },
                                                                        onError: (error) => {
                                                                            toast.error('Failed to start quiz', {
                                                                                description: error instanceof Error ? error.message : 'Unknown error',
                                                                            });
                                                                            navigate('/quizzes');
                                                                        },
    });

    // Submit mutation
    const { mutate: submitQuiz, data: results } = useMutation({
        mutationFn: () => {
            if (!attemptData) throw new Error('No attempt data');

            const answersArray: AnswerSubmit[] = answers.map(a => ({
                question_id: a.questionId,
                answer: a.answer,
            }));

            return submitQuizAttemptApiV1QuizzesAttemptsAttemptIdSubmitPost({
                attemptId: attemptData.attempt_id,
                requestBody: answersArray,
            });
        },
        onSuccess: () => {
            setShowResults(true);
            toast.success('Quiz submitted successfully!');
        },
        onError: (error) => {
            toast.error('Failed to submit quiz', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        },
    });

    // Start attempt on mount
    useEffect(() => {
        if (id && !attemptData) {
            startAttempt();
        }
    }, [id]);

    // Timer countdown
    useEffect(() => {
        if (timeRemaining === null || timeRemaining <= 0) return;

        const interval = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev === null || prev <= 1) {
                    clearInterval(interval);
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [timeRemaining]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const currentQuestion = attemptData?.questions?.[currentQuestionIndex];
    const totalQuestions = attemptData?.questions?.length || 0;
    const answeredCount = answers.length;
    const progressPercent = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

    const handleAnswer = (answer: string) => {
        if (!currentQuestion) return;

        setAnswers((prev) => {
            const existing = prev.find((a) => a.questionId === currentQuestion.id);
            if (existing) {
                return prev.map((a) =>
                a.questionId === currentQuestion.id ? { ...a, answer } : a
                );
            }
            return [...prev, { questionId: currentQuestion.id, answer, flagged: false }];
        });
    };

    const toggleFlag = () => {
        if (!currentQuestion) return;
        setFlaggedQuestions((prev) => {
            const next = new Set(prev);
            if (next.has(currentQuestion.id)) {
                next.delete(currentQuestion.id);
            } else {
                next.add(currentQuestion.id);
            }
            return next;
        });
    };

    const handleSubmit = () => {
        if (answers.length < totalQuestions) {
            const unanswered = totalQuestions - answers.length;
            if (
                !confirm(
                    `You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Submit anyway?`
                )
            ) {
                return;
            }
        }
        submitQuiz();
    };

    const currentAnswer = answers.find((a) => a.questionId === currentQuestion?.id)?.answer;

    if (isStarting || !attemptData) {
        return (
            <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
        );
    }

    if (!attemptData.questions || attemptData.questions.length === 0) {
        return <div>Quiz not found or has no questions</div>;
    }

    // Results View
    if (showResults && results) {
        const score = typeof results.score === 'string' ? parseFloat(results.score) : results.score || 0;
        const percentage = results.percentage || 0;

        return (
            <>
            <Confetti recycle={false} numberOfPieces={500} />
            <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto"
            >
            <Card>
            <CardContent className="py-12 text-center">
            <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            >
            <Trophy className="h-20 w-20 text-yellow-500 mx-auto mb-6" />
            </motion.div>

            <h1 className="text-3xl font-bold mb-2">Quiz Complete!</h1>
            <p className="text-muted-foreground mb-8">Here are your results:</p>

            <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">{percentage.toFixed(0)}%</p>
            <p className="text-sm text-muted-foreground">Score</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <p className="text-3xl font-bold text-green-600">
            {score.toFixed(0)}/{results.max_score}
            </p>
            <p className="text-sm text-muted-foreground">Points</p>
            </div>
            <div className="p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
            <p className="text-3xl font-bold text-orange-600">
            {results.time_taken_seconds}s
            </p>
            <p className="text-sm text-muted-foreground">Time</p>
            </div>
            </div>

            <div className="flex gap-4 justify-center">
            <Button variant="outline" onClick={() => navigate('/quizzes')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Quizzes
            </Button>
            <Button onClick={() => window.location.reload()}>
            Retake Quiz
            </Button>
            </div>
            </CardContent>
            </Card>
            </motion.div>
            </>
        );
    }

    // Quiz Taking View
    return (
        <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => navigate('/quizzes')}>
        <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-4">
        {timeRemaining !== null && (
            <Badge
            variant="outline"
            className={cn(
                'text-sm',
                timeRemaining < 60 && 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30'
            )}
            >
            <Clock className="h-4 w-4 mr-1" />
            {formatTime(timeRemaining)}
            </Badge>
        )}
        <Badge variant="outline">
        {answeredCount}/{totalQuestions} answered
        </Badge>
        </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
        Question {currentQuestionIndex + 1} of {totalQuestions}
        </span>
        <span className="font-medium">{Math.round(progressPercent)}%</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Question Navigation Circles */}
        <div className="flex flex-wrap gap-2">
        {attemptData.questions.map((q, index) => {
            const isAnswered = answers.some((a) => a.questionId === q.id);
            const isFlagged = flaggedQuestions.has(q.id);
            const isCurrent = index === currentQuestionIndex;

            return (
                <Button
                key={q.id}
                variant={isCurrent ? 'default' : 'outline'}
                size="icon"
                className={cn(
                    'relative',
                    isAnswered && !isCurrent && 'bg-green-100 dark:bg-green-950/30',
                    isFlagged && 'ring-2 ring-orange-500'
                )}
                onClick={() => setCurrentQuestionIndex(index)}
                >
                {index + 1}
                {isFlagged && (
                    <Flag className="absolute -top-1 -right-1 h-3 w-3 text-orange-500 fill-orange-500" />
                )}
                </Button>
            );
        })}
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
        <motion.div
        key={currentQuestionIndex}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        >
        <Card>
        <CardHeader>
        <div className="flex items-start justify-between">
        <CardTitle className="text-xl">
        Question {currentQuestionIndex + 1}
        </CardTitle>
        <Button
        variant="ghost"
        size="sm"
        onClick={toggleFlag}
        className={cn(
            currentQuestion && flaggedQuestions.has(currentQuestion.id) && 'text-orange-500'
        )}
        >
        <Flag className="h-4 w-4 mr-2" />
        {currentQuestion && flaggedQuestions.has(currentQuestion.id) ? 'Flagged' : 'Flag'}
        </Button>
        </div>
        </CardHeader>
        <CardContent className="space-y-6">
        <p className="text-lg">{currentQuestion?.question_text}</p>

        <RadioGroup value={currentAnswer} onValueChange={handleAnswer}>
        <div className="space-y-3">
        {currentQuestion?.options && typeof currentQuestion.options === 'object' && (
            Object.values(currentQuestion.options).map((option, index) => (
                <div
                key={index}
                className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                <RadioGroupItem value={String(option)} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                {String(option)}
                </Label>
                </div>
            ))
        )}
        </div>
        </RadioGroup>
        </CardContent>
        </Card>
        </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between">
        <Button
        variant="outline"
        onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
        disabled={currentQuestionIndex === 0}
        >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Previous
        </Button>

        {currentQuestionIndex === totalQuestions - 1 ? (
            <Button onClick={handleSubmit}>
            Submit Quiz
            </Button>
        ) : (
            <Button
            onClick={() =>
                setCurrentQuestionIndex((prev) => Math.min(totalQuestions - 1, prev + 1))
            }
            >
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        )}
        </div>
        </div>
    );
}
