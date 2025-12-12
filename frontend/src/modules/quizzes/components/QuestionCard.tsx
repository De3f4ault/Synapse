import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import type { QuestionResponse, AnswerResult } from '@/api/generated';

/**
 * Question Card Component - ENHANCED
 *
 * Displays quiz question with appropriate input type and animated feedback.
 *
 * Enhancements from documentation:
 * - Animated transitions for result states
 * - Better visual hierarchy
 * - Improved accessibility (ARIA labels)
 * - Color-coded feedback
 * - Smooth micro-interactions
 */

interface QuestionCardProps {
    question: QuestionResponse;
    questionNumber: number;
    value?: string;
    onChange?: (value: string) => void;
    result?: AnswerResult;
    disabled?: boolean;
    isFlagged?: boolean;
    onFlag?: () => void;
}

export function QuestionCard({
    question,
    questionNumber,
    value,
    onChange,
    result,
    disabled,
    isFlagged,
    onFlag,
}: QuestionCardProps) {
    const hasAnswer = value && value.length > 0;

    return (
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        >
        <Card
        className={cn(
            'transition-all duration-300',
            result && (result.is_correct ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20' : 'border-red-500 bg-red-50/50 dark:bg-red-950/20'),
                      !result && hasAnswer && 'border-primary/50'
        )}
        >
        <CardHeader>
        <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
        <div className="flex items-center gap-2 mb-3">
        <Badge variant="outline" className="font-mono">
        Q{questionNumber}
        </Badge>
        <Badge variant="secondary">
        {question.points} {question.points === 1 ? 'point' : 'points'}
        </Badge>

        {isFlagged && (
            <Badge variant="outline" className="bg-yellow-50 border-yellow-300 text-yellow-700">
            <AlertCircle className="h-3 w-3 mr-1" />
            Flagged
            </Badge>
        )}

        <AnimatePresence>
        {result && (
            <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
            <Badge
            variant={result.is_correct ? 'default' : 'destructive'}
            className={result.is_correct ? 'bg-green-500' : ''}
            >
            {result.is_correct ? (
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
            </motion.div>
        )}
        </AnimatePresence>
        </div>
        <CardTitle className="text-lg leading-relaxed">
        {question.question_text}
        </CardTitle>
        </div>
        </div>
        </CardHeader>

        <CardContent className="space-y-4">
        {/* Multiple Choice */}
        {question.question_type === 'multiple_choice' && question.options && (
            <RadioGroup
            value={value}
            onValueChange={onChange}
            disabled={disabled}
            className="space-y-3"
            >
            {Object.entries(question.options).map(([key, optionValue]) => {
                const isSelected = value === key;
                const isCorrect = result?.correct_answer === key;
                const isWrong = result && !result.is_correct && value === key;

                return (
                    <motion.div
                    key={key}
                    whileHover={!disabled ? { scale: 1.01 } : {}}
                    whileTap={!disabled ? { scale: 0.99 } : {}}
                    className={cn(
                        'flex items-center space-x-3 p-3 rounded-lg border-2 transition-all',
                        isSelected && !result && 'border-primary bg-primary/5',
                        isCorrect && result && 'border-green-500 bg-green-50 dark:bg-green-950',
                        isWrong && 'border-red-500 bg-red-50 dark:bg-red-950',
                        !isSelected && !result && 'border-border hover:border-primary/50',
                        disabled && 'cursor-not-allowed opacity-75'
                    )}
                    >
                    <RadioGroupItem
                    value={key}
                    id={`${question.id}-${key}`}
                    disabled={disabled}
                    />
                    <Label
                    htmlFor={`${question.id}-${key}`}
                    className={cn(
                        'flex-1 cursor-pointer text-base',
                        disabled && 'cursor-not-allowed'
                    )}
                    >
                    <span className="font-medium mr-2">
                    {key.toUpperCase()}.
                    </span>
                    {String(optionValue)}
                    </Label>
                    {isCorrect && result && (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                    {isWrong && (
                        <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    </motion.div>
                );
            })}
            </RadioGroup>
        )}

        {/* True/False */}
        {question.question_type === 'true_false' && (
            <RadioGroup
            value={value}
            onValueChange={onChange}
            disabled={disabled}
            className="space-y-3"
            >
            {['true', 'false'].map((option) => {
                const isSelected = value === option;
                const isCorrect = result?.correct_answer === option;
                const isWrong = result && !result.is_correct && value === option;

                return (
                    <motion.div
                    key={option}
                    whileHover={!disabled ? { scale: 1.01 } : {}}
                    whileTap={!disabled ? { scale: 0.99 } : {}}
                    className={cn(
                        'flex items-center space-x-3 p-3 rounded-lg border-2 transition-all',
                        isSelected && !result && 'border-primary bg-primary/5',
                        isCorrect && result && 'border-green-500 bg-green-50 dark:bg-green-950',
                        isWrong && 'border-red-500 bg-red-50 dark:bg-red-950',
                        !isSelected && !result && 'border-border hover:border-primary/50',
                        disabled && 'cursor-not-allowed opacity-75'
                    )}
                    >
                    <RadioGroupItem
                    value={option}
                    id={`${question.id}-${option}`}
                    disabled={disabled}
                    />
                    <Label
                    htmlFor={`${question.id}-${option}`}
                    className={cn(
                        'flex-1 cursor-pointer text-base capitalize',
                        disabled && 'cursor-not-allowed'
                    )}
                    >
                    {option}
                    </Label>
                    {isCorrect && result && (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                    {isWrong && (
                        <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    </motion.div>
                );
            })}
            </RadioGroup>
        )}

        {/* Short Answer */}
        {question.question_type === 'short_answer' && (
            <div className="space-y-2">
            <Input
            placeholder="Type your answer..."
            value={value || ''}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={disabled}
            className={cn(
                'text-base',
                result && (result.is_correct ? 'border-green-500' : 'border-red-500')
            )}
            aria-label={`Answer for question ${questionNumber}`}
            />
            {hasAnswer && !result && (
                <p className="text-sm text-muted-foreground">
                Character count: {value.length}/200
                </p>
            )}
            </div>
        )}

        {/* Result Details */}
        <AnimatePresence>
        {result && (
            <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
            >
            <div className="mt-4 p-4 rounded-md bg-muted space-y-3">
            {!result.is_correct && (
                <>
                <div>
                <p className="text-sm font-medium text-red-600 mb-1">
                Your Answer:
                </p>
                <p className="text-sm text-muted-foreground">
                {result.your_answer}
                </p>
                </div>
                <div>
                <p className="text-sm font-medium text-green-600 mb-1">
                Correct Answer:
                </p>
                <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                {result.correct_answer}
                </p>
                </div>
                </>
            )}
            {result.explanation && (
                <div>
                <p className="text-sm font-medium mb-1">
                Explanation:
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                {result.explanation}
                </p>
                </div>
            )}
            <div className="pt-2 border-t">
            <p className="text-sm">
            <span className="font-medium">Points Earned:</span>{' '}
            <span className={cn(
                'font-bold',
                result.is_correct ? 'text-green-600' : 'text-red-600'
            )}>
            {result.points_earned}
            </span>
            {' / '}{question.points}
            </p>
            </div>
            </div>
            </motion.div>
        )}
        </AnimatePresence>
        </CardContent>
        </Card>
        </motion.div>
    );
}
