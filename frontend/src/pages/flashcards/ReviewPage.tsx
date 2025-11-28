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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
    ChevronLeft,
    RotateCcw,
    Smile,
    Meh,
    Frown,
    Timer,
    Trophy,
    Target,
    Brain,
    Zap,
    Sparkles,
    Lightbulb,
    BookOpen,
    Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { FlashcardResponse } from '@/api/generated/types.gen';

type ReviewQuality = 'again' | 'hard' | 'good' | 'easy';

/**
 * Imprint Card System - Enhanced Review Experience
 *
 * Features:
 * - 3D card flip animation with neural theme
 * - Deep space aesthetic with noise texture
 * - Neural HUD with progress tracking
 * - Quality rating with keyboard shortcuts (1-4)
 * - Session timer and stats
 * - Confetti celebration on completion
 * - TODO: Neural Tutor sidebar (AI feature)
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
        time_taken_ms: 0,
            },
        }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.all });

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
    const progressPercent = totalCards > 0 ? ((currentIndex + 1) / totalCards) * 100 : 0;

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

        setTimeout(() => {
            if (currentIndex + 1 >= totalCards) {
                setShowSummary(true);
            } else {
                setCurrentIndex(currentIndex + 1);
                setIsFlipped(false);
                x.set(0);
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
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 text-cyan-500 animate-spin" />
            <p className="text-slate-400 font-mono text-sm">INITIALIZING NEURAL LINK...</p>
            </div>
            </div>
        );
    }

    if (!dueCards || dueCards.length === 0) {
        return (
            <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
            <Trophy className="h-16 w-16 text-emerald-500 mb-4" />
            <h2 className="text-2xl font-serif font-bold text-white mb-2">Neural Sync Complete</h2>
            <p className="text-slate-400 font-mono text-sm mb-6">
            ALL MEMORY FRAGMENTS SYNCHRONIZED
            </p>
            <Button
            onClick={() => navigate('/flashcards')}
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-white"
            >
            <ChevronLeft className="mr-2 h-4 w-4" />
            EXIT SIMULATION
            </Button>
            </div>
        );
    }

    // Session Summary
    if (showSummary) {
        const totalReviewed = sessionStats.correct + sessionStats.incorrect;
        const accuracy = totalReviewed > 0 ? (sessionStats.correct / totalReviewed) * 100 : 0;

        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center p-8">
            <Confetti recycle={false} numberOfPieces={500} />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />

            <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl w-full relative z-10"
            >
            <Card className="bg-black/40 border-white/10 backdrop-blur-xl text-center">
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <Target className="h-6 w-6 text-blue-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{totalReviewed}</p>
            <p className="text-xs text-slate-400 font-mono uppercase">Reviewed</p>
            </div>
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <Smile className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{sessionStats.correct}</p>
            <p className="text-xs text-slate-400 font-mono uppercase">Correct</p>
            </div>
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <Frown className="h-6 w-6 text-red-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{sessionStats.incorrect}</p>
            <p className="text-xs text-slate-400 font-mono uppercase">Incorrect</p>
            </div>
            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <Timer className="h-6 w-6 text-purple-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{formatTime(elapsedTime)}</p>
            <p className="text-xs text-slate-400 font-mono uppercase">Duration</p>
            </div>
            </div>

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
            className="bg-white/5 hover:bg-white/10 border-white/10 text-white"
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

    return (
        <div className="h-screen bg-[#050505] flex flex-col overflow-hidden">
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

        <div className="flex flex-col items-center">
        <span className="text-xs font-mono text-cyan-500 tracking-[0.2em] uppercase">
        {deckId ? 'MEMORY CORE ACTIVE' : 'NEURAL REVIEW'}
        </span>
        <div className="w-64 h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
        <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progressPercent}%` }}
        className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
        />
        </div>
        </div>

        <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm font-mono text-slate-400">
        <Timer className="h-4 w-4" />
        <span>{formatTime(elapsedTime)}</span>
        </div>
        <div className="px-3 py-1 bg-white/5 border border-white/10 rounded text-xs font-mono text-slate-300">
        {remainingCards} REMAINING
        </div>
        </div>
        </div>

        {/* Main Card Area */}
        <div className="flex-1 flex items-center justify-center p-8 relative">
        {currentCard && (
            <AnimatePresence mode="wait">
            <motion.div
            key={currentCard.id}
            style={{ x, rotateZ, opacity }}
            drag={isFlipped ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={handleSwipeEnd}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-2xl"
            >
            <ImprintCard
            card={currentCard}
            isFlipped={isFlipped}
            onFlip={() => setIsFlipped(!isFlipped)}
            />
            </motion.div>
            </AnimatePresence>
        )}
        </div>

        {/* Quality Controls */}
        <div className="h-32 border-t border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-center gap-4 z-20 relative px-8">
        <AnimatePresence>
        {isFlipped ? (
            <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex gap-4 w-full max-w-3xl"
            >
            {[
                { quality: 'again' as ReviewQuality, label: 'AGAIN', icon: RotateCcw, color: 'red', key: '1' },
                { quality: 'hard' as ReviewQuality, label: 'HARD', icon: Frown, color: 'amber', key: '2' },
                { quality: 'good' as ReviewQuality, label: 'GOOD', icon: Meh, color: 'cyan', key: '3' },
                { quality: 'easy' as ReviewQuality, label: 'EASY', icon: Smile, color: 'emerald', key: '4' },
            ].map((btn, index) => (
                <motion.button
                key={btn.quality}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleReview(btn.quality)}
                className={`flex-1 px-6 py-4 rounded-lg border transition-all font-bold text-xs uppercase tracking-widest flex flex-col items-center gap-2 ${
                    btn.color === 'red'
                    ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                    : btn.color === 'amber'
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                    : btn.color === 'cyan'
                    ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                }`}
                >
                <btn.icon size={20} />
                {btn.label}
                <kbd className="text-[10px] opacity-60">({btn.key})</kbd>
                </motion.button>
            ))}
            </motion.div>
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

        {/* TODO: Neural Tutor Sidebar */}
        {/*
            <NeuralTutorSidebar card={currentCard} />
            Note: This component needs to be implemented with Gemini API integration
            Features: Mnemonic generation, ELI5 explanations, hint system
            */}
            </div>
    );
}

/**
 * Imprint Card - 3D Flip Component
 */
interface ImprintCardProps {
    card: FlashcardResponse;
    isFlipped: boolean;
    onFlip: () => void;
}

function ImprintCard({ card, isFlipped, onFlip }: ImprintCardProps) {
    return (
        <div
        className="w-full aspect-[16/10] cursor-pointer"
        style={{ perspective: '1000px' }}
        onClick={onFlip}
        >
        <motion.div
        className="w-full h-full relative"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
        {/* FRONT */}
        <div
        className="absolute inset-0 rounded-3xl bg-[#080a0e] border border-white/10 shadow-2xl flex flex-col items-center justify-center p-12 text-center overflow-hidden"
        style={{ backfaceVisibility: 'hidden' }}
        >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent opacity-50" />
        <div className="absolute top-6 left-6 text-xs font-mono text-cyan-500/50 flex items-center gap-2">
        <Brain size={14} />
        QUERY_LAYER
        </div>
        <h2 className="text-3xl md:text-4xl font-serif text-slate-200 relative z-10 leading-tight">
        {card.front_text}
        </h2>
        <div className="absolute bottom-8 text-xs font-mono text-slate-600 animate-pulse uppercase tracking-widest">
        TAP TO REVEAL
        </div>
        </div>

        {/* BACK */}
        <div
        className="absolute inset-0 rounded-3xl bg-[#0a0c12] border border-purple-500/30 shadow-[0_0_50px_rgba(168,85,247,0.15)] flex flex-col items-center justify-center p-12 text-center overflow-hidden"
        style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
        }}
        >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent opacity-50" />
        <div className="absolute top-6 right-6 text-xs font-mono text-purple-500/50 flex items-center gap-2">
        DATA_CORE
        <Zap size={14} />
        </div>
        <p className="text-xl md:text-2xl font-sans text-white/90 relative z-10 leading-relaxed">
        {card.back_text}
        </p>
        </div>
        </motion.div>
        </div>
    );
}
