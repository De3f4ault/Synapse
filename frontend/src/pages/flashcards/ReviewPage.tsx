/**
 * ReviewPage - Imprint Card System
 * REFACTORED: Now uses modular components with Premium UI
 */

import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { ChevronLeft, Trophy, Loader2, Clock, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDueCards } from './hooks/useCards';
import { useReviewSession, formatTime } from './hooks/useReviewSession';
import { CardFlip } from './components/review/CardFlip';
import { DifficultyButtons } from './components/review/DifficultyButtons';
import { SwipeGesture } from './components/review/SwipeGesture';
import { FloatingPageDock } from '@/components/layout/FloatingPageDock';
import { cn } from '@/lib/utils';
import type { ReviewQuality } from './types/flashcards.types';

export function ReviewPage() {
    const { deckId } = useParams<{ deckId: string }>();
    const navigate = useNavigate();

    // Fetch due cards
    const { data: dueCards, isLoading } = useDueCards(deckId ? parseInt(deckId, 10) : undefined);

    // Review session hook
    const {
        session,
        currentCard,
        isFlipped,
        sessionEnded,
        isPending,
        elapsedTime,
        flipCard,
        reviewCard,
        remainingCards,
        progress,
    } = useReviewSession({
        cards: dueCards || [],
        deckId: deckId ? parseInt(deckId, 10) : undefined,
    });

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#020202] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 text-cyan-500 animate-spin" />
                    <p className="text-slate-400 font-mono text-sm">INITIALIZING NEURAL LINK...</p>
                </div>
            </div>
        );
    }

    // No cards available
    if (!dueCards || dueCards.length === 0) {
        return (
            <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="z-10 flex flex-col items-center"
                >
                    <Trophy className="h-20 w-20 text-emerald-500 mb-6" />
                    <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">All Caught Up!</h2>
                    <p className="text-slate-400 text-lg mb-8 text-center max-w-md">
                        You've reviewed all pending cards. Great work keeping your neural pathways active.
                    </p>
                    <Button
                        onClick={() => navigate('/flashcards')}
                        className="synapse-button bg-white/5 hover:bg-white/10 px-8 py-6 text-base"
                    >
                        <ChevronLeft className="mr-2 h-5 w-5" />
                        Return to Deck Hub
                    </Button>
                </motion.div>
            </div>
        );
    }

    // Session summary
    if (sessionEnded) {
        const totalReviewed = session.correct + session.incorrect;
        const accuracy = totalReviewed > 0 ? (session.correct / totalReviewed) * 100 : 0;

        return (
            <div className="h-full bg-[#020202] flex flex-col items-center justify-center relative overflow-hidden p-6 absolute inset-0">
                {accuracy >= 70 && <Confetti numberOfPieces={300} recycle={false} />}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="z-10 w-full max-w-3xl space-y-8"
                >
                    <div className="text-center">
                        <div className="w-20 h-20 mx-auto bg-yellow-500/10 rounded-full flex items-center justify-center border border-yellow-500/20 mb-6">
                            <Trophy size={40} className="text-yellow-400" />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">Session Complete</h1>
                        <p className="text-slate-400">Memory consolidation successful</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="synapse-panel p-6 text-center">
                            <div className="text-sm text-slate-500 uppercase font-bold mb-2">Accuracy</div>
                            <div className={cn(
                                "text-3xl font-bold",
                                accuracy >= 80 ? "text-emerald-400" :
                                    accuracy >= 60 ? "text-yellow-400" : "text-red-400"
                            )}>
                                {Math.round(accuracy)}%
                            </div>
                        </div>
                        <div className="synapse-panel p-6 text-center">
                            <div className="text-sm text-slate-500 uppercase font-bold mb-2">Cards</div>
                            <div className="text-3xl font-bold text-white">
                                {totalReviewed}
                            </div>
                        </div>
                        <div className="synapse-panel p-6 text-center">
                            <div className="text-sm text-slate-500 uppercase font-bold mb-2">Correct</div>
                            <div className="text-3xl font-bold text-emerald-400">
                                {session.correct}
                            </div>
                        </div>
                        <div className="synapse-panel p-6 text-center">
                            <div className="text-sm text-slate-500 uppercase font-bold mb-2">Time</div>
                            <div className="text-3xl font-bold text-cyan-400">
                                {formatTime(elapsedTime)}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 justify-center pt-8">
                        <Button
                            variant="default"
                            onClick={() => navigate('/flashcards')}
                            className="synapse-button-primary px-8"
                        >
                            Finish Review
                        </Button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Main Card Interface
    return (
        <div className="h-screen bg-[#020202] flex flex-col text-white relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-black to-black pointer-events-none" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />

            {/* Header */}
            <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 z-20 backdrop-blur-sm bg-black/20">
                <button
                    onClick={() => {
                        if (confirm('End review session? Progress will be saved.')) {
                            navigate('/flashcards');
                        }
                    }}
                    className="text-slate-400 hover:text-white text-sm flex items-center gap-2 transition-colors"
                >
                    <ChevronLeft size={16} />
                    Exit
                </button>

                <div className="flex items-center gap-6 text-sm tabular-nums">
                    <div className="flex items-center gap-2 text-slate-400">
                        <Clock size={14} />
                        {formatTime(elapsedTime)}
                    </div>
                    <div className="flex items-center gap-2 text-cyan-400">
                        <Brain size={14} />
                        {remainingCards} cards left
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-slate-900 w-full relative z-20">
                <motion.div
                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                />
            </div>

            {/* Main Card Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
                <div className="w-full max-w-2xl aspect-[3/2] relative">
                    {currentCard && (
                        <AnimatePresence mode="wait">
                            <SwipeGesture
                                key={currentCard.id}
                                onSwipe={reviewCard}
                                isEnabled={isFlipped}
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 1.05 }}
                                    transition={{ duration: 0.2 }}
                                    className="w-full h-full"
                                >
                                    <CardFlip
                                        card={currentCard}
                                        isFlipped={isFlipped}
                                        onFlip={flipCard}
                                    />
                                </motion.div>
                            </SwipeGesture>
                        </AnimatePresence>
                    )}
                </div>

                {/* Keyboard Hints */}
                {!isFlipped && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-8 text-slate-500 font-mono text-xs tracking-[0.2em] uppercase"
                    >
                        Press Space to Reveal
                    </motion.div>
                )}
            </div>

            {/* Controls Footer */}
            <FloatingPageDock className="justify-center bg-black/40 backdrop-blur-xl border-t border-white/5">
                <AnimatePresence mode="wait">
                    {isFlipped ? (
                        <div className="w-full max-w-2xl px-4">
                            <DifficultyButtons
                                onReview={(q) => reviewCard(q as ReviewQuality)}
                                disabled={isPending}
                            />
                        </div>
                    ) : (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            onClick={flipCard}
                            className="synapse-button px-12 py-3 text-lg font-medium tracking-wide w-full max-w-sm"
                        >
                            Show Answer
                        </motion.button>
                    )}
                </AnimatePresence>
            </FloatingPageDock>
        </div>
    );
}
