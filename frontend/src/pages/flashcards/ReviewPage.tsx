/**
 * ReviewPage - Imprint Card System
 * REFACTORED: Now uses modular components
 */

import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { ChevronLeft, Trophy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDueCards } from './hooks/useCards';
import { useReviewSession } from './hooks/useReviewSession';
import { CardFlip } from './components/review/CardFlip';
import { DifficultyButtons } from './components/review/DifficultyButtons';
import { ReviewProgress } from './components/review/ReviewProgress';
import { ReviewTimer } from './components/review/ReviewTimer';
import { SwipeGesture } from './components/review/SwipeGesture';
import { ReviewStats } from './components/shared/ReviewStats';

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
    } = useReviewSession({
        cards: dueCards || [],
        deckId: deckId ? parseInt(deckId, 10) : undefined,
        onComplete: () => {
            // Session complete
        },
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
            <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
                <Trophy className="h-16 w-16 text-emerald-500 mb-4" />
                <h2 className="text-2xl font-serif font-bold text-white mb-2">Neural Sync Complete</h2>
                <p className="text-slate-400 font-mono text-sm mb-6">
                    ALL MEMORY FRAGMENTS SYNCHRONIZED
                </p>
                <Button
                    onClick={() => navigate('/flashcards')}
                    className="bg-white/5 hover:bg-white/10 border border-white/5 text-white"
                >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    EXIT SIMULATION
                </Button>
            </div>
        );
    }

    // Session summary
    if (sessionEnded) {
        const totalReviewed = session.correct + session.incorrect;
        const accuracy = totalReviewed > 0 ? (session.correct / totalReviewed) * 100 : 0;

        return (
            <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center relative overflow-hidden">
                <Confetti numberOfPieces={200} recycle={false} />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />

                <div className="z-10 w-full max-w-2xl px-6">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/flashcards')}
                        className="mb-8 text-slate-500 hover:text-white flex items-center gap-2 text-xs font-bold font-mono uppercase tracking-wider transition-colors"
                    >
                        <ChevronLeft size={16} />
                        Exit Review
                    </Button>

                    <ReviewStats
                        session={session}
                        reviewedCount={totalReviewed}
                        accuracy={accuracy}
                    />
                </div>
            </div>
        );
    }

    // Main Card Interface
    return (
        <div className="min-h-screen bg-[#020202] flex flex-col text-white relative overflow-hidden">

            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-black to-black pointer-events-none" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />

            {/* Header */}
            <div className="h-20 border-b border-white/5 flex items-center justify-between px-8 z-20 backdrop-blur-sm">
                <button
                    onClick={() => navigate('/flashcards')}
                    className="text-slate-500 hover:text-white flex items-center gap-2 text-xs font-bold font-mono uppercase tracking-wider transition-colors"
                >
                    <ChevronLeft size={16} />
                    Exit
                </button>

                <ReviewProgress
                    current={session.currentIndex}
                    total={session.cards.length}
                    title={deckId ? 'ACTIVE SESSION' : 'REVIEW'}
                />

                <div className="flex items-center gap-4">
                    <ReviewTimer elapsedSeconds={elapsedTime} />
                    <div className="px-3 py-1 bg-white/5 border border-white/5 rounded text-[10px] font-mono text-slate-300">
                        {remainingCards} LEFT
                    </div>
                </div>
            </div>

            {/* Main Card Area */}
            <div className="flex-1 flex items-center justify-center p-8 relative">
                {currentCard && (
                    <AnimatePresence mode="wait">
                        <SwipeGesture
                            key={currentCard.id}
                            onSwipe={reviewCard}
                            isEnabled={isFlipped}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                                transition={{ duration: 0.3 }}
                                className="w-full max-w-2xl"
                            >
                                <CardFlip card={currentCard} isFlipped={isFlipped} onFlip={flipCard} />
                            </motion.div>
                        </SwipeGesture>
                    </AnimatePresence>
                )}
            </div>

            {/* Quality Controls */}
            <div className="h-32 border-t border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-center gap-4 z-20 relative px-8">
                <AnimatePresence>
                    {isFlipped ? (
                        <DifficultyButtons onReview={reviewCard} disabled={isPending} />
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-slate-500 font-mono text-[10px] animate-pulse uppercase tracking-widest"
                        >
                            TAP CARD TO REVEAL // SPACEBAR
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
