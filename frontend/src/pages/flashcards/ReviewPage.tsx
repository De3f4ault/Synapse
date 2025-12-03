/**
 * ReviewPage - Imprint Card System
 * REFACTORED: Now uses modular components
 */

import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { ChevronLeft, Trophy, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
        progress,
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
            <div className="min-h-screen bg-[#020202] flex items-center justify-center p-8">
            <Confetti recycle={false} numberOfPieces={500} />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />

            <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl w-full relative z-10"
            >
            <Card className="bg-[rgba(10,10,10,0.6)] backdrop-blur-xl border-white/5 text-center">
            <CardContent className="py-12">
            <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            >
            <Trophy className="h-20 w-20 text-yellow-500 mx-auto mb-6" />
            </motion.div>

            <h1 className="text-3xl font-serif font-bold text-white mb-2">
            Imprinting Session Complete
            </h1>
            <p className="text-slate-400 font-mono text-sm mb-8 uppercase tracking-wide">
            NEURAL PATHWAYS STRENGTHENED
            </p>

            <ReviewStats
            stats={{
                totalReviewed,
                correct: session.correct,
                incorrect: session.incorrect,
                accuracy,
                duration: elapsedTime,
                cardsPerMinute: elapsedTime > 0 ? (totalReviewed / elapsedTime) * 60 : 0,
            }}
            />

            <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-mono text-slate-400 uppercase">Accuracy</span>
            <span className="text-2xl font-bold text-emerald-500">
            {accuracy.toFixed(1)}%
            </span>
            </div>
            <div className="h-3 bg-white/5 rounded-full overflow-hidden">
            <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${accuracy}%` }}
            transition={{ duration: 1, delay: 0.5 }}
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 shadow-[0_0_10px_currentColor]"
            />
            </div>
            </div>

            <div className="flex gap-4 justify-center">
            <Button
            variant="outline"
            onClick={() => navigate('/flashcards')}
            className="bg-white/5 hover:bg-white/10 border-white/5 text-white"
            >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Return to Hub
            </Button>
            <Button
            onClick={() => navigate('/analytics')}
            className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300"
            >
            <Sparkles className="mr-2 h-4 w-4" />
            View Analytics
            </Button>
            </div>
            </CardContent>
            </Card>
            </motion.div>
            </div>
        );
    }

    // Active review session
    return (
        <div className="h-screen bg-[#020202] flex flex-col overflow-hidden">
        {/* Noise Texture */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />

        {/* Neural HUD - Top Bar */}
        <div className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-black/20 backdrop-blur-sm z-20 relative">
        <button
        onClick={() => navigate('/flashcards')}
        className="text-slate-500 hover:text-white flex items-center gap-2 text-sm font-bold font-mono uppercase tracking-wider transition-colors"
        >
        <ChevronLeft size={18} />
        Exit Simulation
        </button>

        <ReviewProgress
        current={session.currentIndex}
        total={session.cards.length}
        title={deckId ? 'MEMORY CORE ACTIVE' : 'NEURAL REVIEW'}
        />

        <div className="flex items-center gap-4">
        <ReviewTimer elapsedSeconds={elapsedTime} />
        <div className="px-3 py-1 bg-white/5 border border-white/5 rounded text-xs font-mono text-slate-300">
        {remainingCards} REMAINING
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
            className="text-slate-500 font-mono text-xs animate-pulse uppercase tracking-widest"
            >
            TAP CARD TO REVEAL // SPACEBAR
            </motion.div>
        )}
        </AnimatePresence>
        </div>
        </div>
    );
}
