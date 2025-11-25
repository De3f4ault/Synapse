// File: src/pages/flashcards/ReviewPage.tsx

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import Confetti from 'react-confetti';
import {
    getDueCardsApiV1CardsDueGet,
    reviewCardApiV1CardsCardIdReviewPost,
} from '@/api/generated/services.gen';
import { queryKeys } from '@/lib/queryKeys';
import { CardFlip } from '@/modules/flashcards/components/ReviewSession/CardFlip';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft,
    RotateCcw,
    Smile,
    Meh,
    Frown,
    Timer,
    Trophy,
    Target,
    TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { FlashcardResponse } from '@/api/generated/types.gen';

// Local type definition for review quality
type ReviewQuality = 'again' | 'hard' | 'good' | 'easy';

/**
 * Enhanced Review Page
 *
 * Features:
 * - 3D card flip animation
 * - Swipe gestures (left/right for quality rating)
 * - Progress bar with card count
 * - Session timer
 * - Quality buttons with keyboard shortcuts
 * - Session summary with confetti
 * - Accurate/inaccurate card tracking
 */

export function ReviewPage() {
    const { deckId } = useParams<{ deckId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [sessionStats, setSessionStats] = useState({
        correct: 0,
        incorrect: 0,
        startTime: Date.now(),
    });
    const [showSummary, setShowSummary] = useState(false);
    const [reviewedCards, setReviewedCards] = useState<Set<number>>(new Set());

    // Swipe gesture state
    const x = useMotionValue(0);
    const rotateZ = useTransform(x, [-200, 200], [-15, 15]);
    const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

    // Fetch due cards
    const { data: dueCards, isLoading } = useQuery({
        queryKey: deckId
        ? queryKeys.decks.cards(parseInt(deckId, 10))
        : queryKeys.flashcards.due(),
                                                   queryFn: () =>
                                                   getDueCardsApiV1CardsDueGet({
                                                       deckId: deckId ? parseInt(deckId, 10) : undefined,
                                                   }),
    });

    // Review mutation
    const { mutate: reviewCard } = useMutation({
        mutationFn: ({ cardId, quality }: { cardId: number; quality: ReviewQuality }) =>
        reviewCardApiV1CardsCardIdReviewPost({
            cardId: cardId,
            requestBody: {
                quality:
                quality === 'again'
        ? 0
        : quality === 'hard'
        ? 1
        : quality === 'good'
        ? 3
        : 5,
        time_taken_ms: 0, // Optionally track time
            },
        }),
        onSuccess: (_, variables) => {
            setReviewedCards((prev) => new Set(prev).add(variables.cardId));
            queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.all });

            // Track accuracy
            if (variables.quality === 'easy' || variables.quality === 'good') {
                setSessionStats((prev) => ({ ...prev, correct: prev.correct + 1 }));
            } else {
                setSessionStats((prev) => ({ ...prev, incorrect: prev.incorrect + 1 }));
            }
        },
        onError: (error) => {
            toast.error('Failed to review card', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        },
    });

    const currentCard = dueCards?.[currentIndex];
    const totalCards = dueCards?.length || 0;
    const remainingCards = totalCards - currentIndex;
    const progressPercent = totalCards > 0 ? (currentIndex / totalCards) * 100 : 0;

    // Session timer
    const [elapsedTime, setElapsedTime] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - sessionStats.startTime) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [sessionStats.startTime]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (showSummary) return;

            if (e.key === ' ' && currentCard) {
                e.preventDefault();
                setIsFlipped(!isFlipped);
            }

            if (isFlipped && currentCard) {
                if (e.key === '1') handleReview('again');
                if (e.key === '2') handleReview('hard');
                if (e.key === '3') handleReview('good');
                if (e.key === '4') handleReview('easy');
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isFlipped, currentCard, showSummary]);

    const handleReview = (quality: ReviewQuality) => {
        if (!currentCard) return;

        reviewCard({ cardId: currentCard.id, quality });

        // Move to next card
        setTimeout(() => {
            if (currentIndex + 1 >= totalCards) {
                setShowSummary(true);
            } else {
                setCurrentIndex(currentIndex + 1);
                setIsFlipped(false);
                x.set(0); // Reset swipe position
            }
        }, 300);
    };

    const handleSwipeEnd = () => {
        const threshold = 100;
        const currentX = x.get();

        if (Math.abs(currentX) > threshold && isFlipped) {
            if (currentX < 0) {
                handleReview('again');
            } else {
                handleReview('easy');
            }
        } else {
            x.set(0);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
        );
    }

    if (!dueCards || dueCards.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
            <Trophy className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">All caught up!</h2>
            <p className="text-muted-foreground mb-6">
            No cards due for review right now.
            </p>
            <Button onClick={() => navigate('/flashcards')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Decks
            </Button>
            </div>
        );
    }

    // Session Summary
    if (showSummary) {
        const totalReviewed = sessionStats.correct + sessionStats.incorrect;
        const accuracy =
        totalReviewed > 0 ? (sessionStats.correct / totalReviewed) * 100 : 0;

        return (
            <>
            <Confetti recycle={false} numberOfPieces={500} />
            <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto"
            >
            <Card className="text-center">
            <CardContent className="py-12">
            <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            >
            <Trophy
            className="h-20 w-20 text-yellow-500 mx-auto mb-6"
            />
            </motion.div>

            <h1 className="text-3xl font-bold mb-2">Session Complete!</h1>
            <p className="text-muted-foreground mb-8">
            Great work! Here's how you did:
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
            <Target className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{totalReviewed}</p>
            <p className="text-sm text-muted-foreground">
            Cards Reviewed
            </p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <Smile className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{sessionStats.correct}</p>
            <p className="text-sm text-muted-foreground">Correct</p>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
            <Frown className="h-6 w-6 text-red-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{sessionStats.incorrect}</p>
            <p className="text-sm text-muted-foreground">Incorrect</p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
            <Timer className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{formatTime(elapsedTime)}</p>
            <p className="text-sm text-muted-foreground">Time</p>
            </div>
            </div>

            <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Accuracy</span>
            <span className="text-2xl font-bold text-green-600">
            {accuracy.toFixed(1)}%
            </span>
            </div>
            <Progress value={accuracy} className="h-3" />
            </div>

            <div className="flex gap-4 justify-center">
            <Button variant="outline" onClick={() => navigate('/flashcards')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Decks
            </Button>
            <Button onClick={() => navigate('/analytics')}>
            <TrendingUp className="mr-2 h-4 w-4" />
            View Analytics
            </Button>
            </div>
            </CardContent>
            </Card>
            </motion.div>
            </>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => navigate('/flashcards')}>
        <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
        <Timer className="h-4 w-4" />
        <span className="font-mono">{formatTime(elapsedTime)}</span>
        </div>
        <Badge variant="outline" className="text-sm">
        {remainingCards} remaining
        </Badge>
        </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
        Card {currentIndex + 1} of {totalCards}
        </span>
        <span className="font-medium">{Math.round(progressPercent)}%</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Card */}
        {currentCard && (
            <AnimatePresence mode="wait">
            <motion.div
            key={currentCard.id}
            style={{ x, rotateZ, opacity }}
            drag={isFlipped ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={handleSwipeEnd}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            >
            <CardFlip
            card={currentCard}
            isFlipped={isFlipped}
            onFlip={() => setIsFlipped(!isFlipped)}
            />
            </motion.div>
            </AnimatePresence>
        )}

        {/* Quality Buttons */}
        <AnimatePresence>
        {isFlipped && (
            <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="grid grid-cols-4 gap-3"
            >
            {[
                {
                    quality: 'again' as ReviewQuality,
                    label: 'Again',
                    icon: RotateCcw,
                    color: 'destructive',
                    key: '1',
                },
                {
                    quality: 'hard' as ReviewQuality,
                    label: 'Hard',
                    icon: Frown,
                    color: 'default',
                    key: '2',
                },
                {
                    quality: 'good' as ReviewQuality,
                    label: 'Good',
                    icon: Meh,
                    color: 'default',
                    key: '3',
                },
                {
                    quality: 'easy' as ReviewQuality,
                    label: 'Easy',
                    icon: Smile,
                    color: 'default',
                    key: '4',
                },
            ].map((btn, index) => (
                <motion.div
                key={btn.quality}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                >
                <Button
                variant={btn.color === 'destructive' ? 'destructive' : 'outline'}
                className="w-full h-auto py-4 flex-col gap-2"
                onClick={() => handleReview(btn.quality)}
                >
                <btn.icon className="h-6 w-6" />
                <span className="font-semibold">{btn.label}</span>
                <kbd className="text-xs opacity-60">{btn.key}</kbd>
                </Button>
                </motion.div>
            ))}
            </motion.div>
        )}
        </AnimatePresence>
        </div>
    );
}
