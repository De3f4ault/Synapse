import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, Clock, Trophy, RotateCw, X } from 'lucide-react';
import type { QuizResultResponse } from '@/api/generated';

/**
 * Results Component
 *
 * Display quiz results with score breakdown and answer review.
 */

interface ResultsProps {
    result: QuizResultResponse;
    onRetake?: () => void;
    onClose?: () => void;
}

export function Results({ result, onRetake, onClose }: ResultsProps) {
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getScoreColor = (percentage: number): string => {
        if (percentage >= 80) return 'text-green-600';
        if (percentage >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getScoreEmoji = (percentage: number): string => {
        if (percentage >= 90) return 'Excellent';
        if (percentage >= 80) return 'Great';
        if (percentage >= 70) return 'Good';
        if (percentage >= 60) return 'Passed';
        return 'Review Needed';
    };

    return (
        <div className="space-y-6">
            {/* Header with Score */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <Trophy className="h-6 w-6 text-yellow-500" />
                            Quiz Complete!
                        </span>
                        {onClose && (
                            <Button variant="ghost" size="icon" onClick={onClose}>
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center space-y-4">
                        <div className="text-6xl">{getScoreEmoji(result.percentage)}</div>

                        <div>
                            <div className={`text-5xl font-bold ${getScoreColor(result.percentage)}`}>
                                {result.percentage.toFixed(1)}%
                            </div>
                            <p className="text-muted-foreground mt-2">
                                {result.score} / {result.max_score} points
                            </p>
                        </div>

                        <Progress value={result.percentage} className="h-2" />

                        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {formatTime(result.time_taken_seconds)}
                            </div>
                            <div className="flex items-center gap-1">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                {result.answers.filter(a => a.is_correct).length} correct
                            </div>
                            <div className="flex items-center gap-1">
                                <XCircle className="h-4 w-4 text-red-600" />
                                {result.answers.filter(a => !a.is_correct).length} incorrect
                            </div>
                        </div>

                        {onRetake && (
                            <Button onClick={onRetake} className="mt-4">
                                <RotateCw className="mr-2 h-4 w-4" />
                                Retake Quiz
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Answer Review */}
            <div className="space-y-4">
                <h3 className="text-xl font-semibold">Answer Review</h3>

                {result.answers.map((answer, index) => (
                    <Card key={answer.question_id}>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between text-base">
                                <span className="flex items-center gap-2">
                                    Question {index + 1}
                                    <Badge variant={answer.is_correct ? 'default' : 'destructive'}>
                                        {answer.is_correct ? (
                                            <>
                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                                Correct
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="h-3 w-3 mr-1" />
                                                Incorrect
                                            </>
                                        )}
                                    </Badge>
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    {answer.points_earned} / {answer.points_earned + (answer.is_correct ? 0 : 1)} pts
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <p className="font-medium">{answer.question_text}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className={`p-3 rounded-md border-2 ${answer.is_correct
                                        ? 'border-green-500 bg-green-50 dark:bg-green-950'
                                        : 'border-red-500 bg-red-50 dark:bg-red-950'
                                    }`}>
                                    <p className="text-xs text-muted-foreground mb-1">Your Answer</p>
                                    <p className="font-medium">{answer.your_answer}</p>
                                </div>

                                {!answer.is_correct && (
                                    <div className="p-3 rounded-md border-2 border-green-500 bg-green-50 dark:bg-green-950">
                                        <p className="text-xs text-muted-foreground mb-1">Correct Answer</p>
                                        <p className="font-medium">{answer.correct_answer}</p>
                                    </div>
                                )}
                            </div>

                            {answer.explanation && (
                                <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                                    <p className="text-xs text-muted-foreground mb-1">Explanation</p>
                                    <p className="text-sm">{answer.explanation}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
