/**
 * ChatQuizPreview - Inline quiz preview in chat
 *
 * INVARIANT: This is preview-only. No attempt state mutation.
 * INVARIANT: User can answer questions locally, but nothing persists.
 * INVARIANT: Save is explicit and user-initiated.
 */

import { useState } from 'react';
import { CheckCircle2, XCircle, Save, HelpCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { QuizQuestionPreview } from '@/shared/rendering/schema';

interface ChatQuizPreviewProps {
    title: string;
    questions: QuizQuestionPreview[];
    difficulty?: 'easy' | 'medium' | 'hard';
    onSave?: (quiz: { title: string; questions: QuizQuestionPreview[]; difficulty?: string }) => void;
}

export function ChatQuizPreview({ title, questions, difficulty, onSave }: ChatQuizPreviewProps) {
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [showResults, setShowResults] = useState(false);

    const handleAnswer = (questionId: string, answer: string) => {
        if (showResults) return;
        setAnswers((prev) => ({ ...prev, [questionId]: answer }));
    };

    const handleSubmit = () => {
        setShowResults(true);
    };

    const handleReset = () => {
        setAnswers({});
        setShowResults(false);
    };

    const getScore = () => {
        let correct = 0;
        questions.forEach((q) => {
            const userAnswer = answers[q.id];
            if (q.type === 'multiple_choice' && q.correctIndex !== undefined && q.options) {
                if (userAnswer === q.options[q.correctIndex]) correct++;
            } else if (userAnswer === q.correctAnswer) {
                correct++;
            }
        });
        return correct;
    };

    if (!questions || questions.length === 0) {
        return (
            <div className="p-4 text-center text-muted-foreground">
                <p>No questions available</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-accent/10">
                        <HelpCircle className="size-4 text-accent" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{title}</span>
                        {difficulty && (
                            <span className={cn(
                                "text-[10px] px-2 py-0.5 rounded-full uppercase font-medium",
                                difficulty === 'easy' && "bg-accent-olive/20 text-accent-olive",
                                difficulty === 'medium' && "bg-yellow-500/20 text-yellow-400",
                                difficulty === 'hard' && "bg-destructive/20 text-destructive"
                            )}>
                                {difficulty}
                            </span>
                        )}
                    </div>
                </div>
                {onSave && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSave({ title, questions, difficulty })}
                        className="h-7 text-xs gap-1.5 border-accent/30 hover:bg-accent/10 hover:border-accent/50 transition-colors"
                    >
                        <Save className="size-3" />
                        Save Quiz
                    </Button>
                )}
            </div>

            {/* Questions */}
            <div className="space-y-5">
                {questions.map((q, idx) => (
                    <div key={q.id} className="space-y-2.5">
                        <p className="text-sm font-medium">
                            <span className="text-muted-foreground mr-2">{idx + 1}.</span>
                            {q.prompt}
                        </p>

                        {q.type === 'multiple_choice' && q.options && (
                            <div className="space-y-1.5 pl-4">
                                {q.options.map((opt, optIdx) => {
                                    const isSelected = answers[q.id] === opt;
                                    const showCorrect = showResults && optIdx === q.correctIndex;
                                    const showWrong = showResults && isSelected && optIdx !== q.correctIndex;

                                    return (
                                        <button
                                            key={optIdx}
                                            onClick={() => handleAnswer(q.id, opt)}
                                            disabled={showResults}
                                            className={cn(
                                                "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all",
                                                "border border-border",
                                                !showResults && "hover:border-border hover:bg-muted/50",
                                                !showResults && isSelected && "border-accent/50 bg-accent/10",
                                                showCorrect && "border-green-500/50 bg-accent-olive/10",
                                                showWrong && "border-destructive/50 bg-destructive/10",
                                                showResults && "cursor-default"
                                            )}
                                        >
                                            <span className="flex items-center gap-2">
                                                <span className="text-muted-foreground text-xs font-mono">
                                                    {String.fromCharCode(65 + optIdx)}.
                                                </span>
                                                <span className="flex-1">{opt}</span>
                                                {showResults && showCorrect && (
                                                    <CheckCircle2 className="size-4 text-accent-olive shrink-0" />
                                                )}
                                                {showResults && showWrong && (
                                                    <XCircle className="size-4 text-destructive shrink-0" />
                                                )}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {showResults && q.explanation && (
                            <div className="flex gap-2 pl-4 pt-1">
                                <span className="text-warning">💡</span>
                                <p className="text-xs text-muted-foreground italic">
                                    {q.explanation}
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Submit / Results */}
            {!showResults ? (
                <Button
                    onClick={handleSubmit}
                    disabled={Object.keys(answers).length === 0}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                    Check Answers
                </Button>
            ) : (
                <div className="space-y-3">
                    <div className="text-center py-3 rounded-lg bg-foreground/5">
                        <p className="text-2xl font-bold">
                            {getScore()} / {questions.length}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {Math.round((getScore() / questions.length) * 100)}% correct
                        </p>
                    </div>
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                            This is a preview. Save to track progress.
                        </p>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReset}
                            className="h-7 text-xs gap-1.5"
                        >
                            <RotateCcw className="size-3" />
                            Try Again
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
