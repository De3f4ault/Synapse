/**
 * ChatFlashcardSet - Inline flashcard preview in chat
 *
 * Design: Matches the real FlashcardView from /flashcards/study
 * - Phone-style aspect ratio (9:16) scaled down for chat
 * - Flip animation with spring physics
 * - Dark card with subtle borders
 * - "Query" header, "Tap to Flip" footer
 *
 * INVARIANT: Preview-only. No SM-2 mutation.
 * INVARIANT: Save is explicit and user-initiated.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Save, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FlashcardCardPreview } from '@/shared/rendering/schema';

interface ChatFlashcardSetProps {
    title: string;
    cards: FlashcardCardPreview[];
    onSave?: (cards: FlashcardCardPreview[]) => void;
}

export function ChatFlashcardSet({ title, cards, onSave }: ChatFlashcardSetProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    const currentCard = cards[currentIndex];
    if (!currentCard || cards.length === 0) {
        return (
            <div className="p-4 text-center text-muted-foreground bg-zinc-900/60 rounded-xl border border-white/5">
                <p>No flashcards available</p>
            </div>
        );
    }

    const goNext = () => {
        setIsFlipped(false);
        setTimeout(() => {
            setCurrentIndex((i) => Math.min(i + 1, cards.length - 1));
        }, 50);
    };

    const goPrev = () => {
        setIsFlipped(false);
        setTimeout(() => {
            setCurrentIndex((i) => Math.max(i - 1, 0));
        }, 50);
    };

    return (
        <div className="my-4 p-4 bg-zinc-900/40 rounded-2xl border border-white/5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-cyan-500/10">
                        <Layers className="size-4 text-cyan-400" />
                    </div>
                    <div>
                        <span className="font-medium text-sm text-white">{title}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                            ({cards.length} cards)
                        </span>
                    </div>
                </div>
                {onSave && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSave(cards)}
                        className="h-7 text-xs gap-1.5 border-cyan-500/30 hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-colors"
                    >
                        <Save className="size-3" />
                        Save to Deck
                    </Button>
                )}
            </div>

            {/* Card Container - Phone-style like real FlashcardView */}
            <div className="flex justify-center">
                <div
                    className="w-full max-w-[280px] aspect-[9/14] cursor-pointer"
                    style={{ perspective: '1200px' }}
                    onClick={() => setIsFlipped(!isFlipped)}
                >
                    <motion.div
                        className="relative w-full h-full"
                        style={{ transformStyle: 'preserve-3d' }}
                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    >
                        {/* FRONT FACE */}
                        <div
                            className="absolute inset-0 rounded-[28px] bg-[#0a0a0f] border border-white/10 overflow-hidden shadow-2xl"
                            style={{
                                backfaceVisibility: 'hidden',
                                WebkitBackfaceVisibility: 'hidden',
                                transform: 'rotateY(0deg)',
                            }}
                        >
                            <div className="w-full h-full p-5 flex flex-col items-center justify-center relative group">
                                {/* Header */}
                                <div className="absolute top-5 left-0 right-0 flex justify-center opacity-30">
                                    <div className="text-[9px] font-mono tracking-[0.3em] uppercase text-white/60">
                                        Query
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="w-full text-center px-3">
                                    <p className="text-base font-semibold text-slate-100 leading-relaxed">
                                        {currentCard.front}
                                    </p>
                                </div>

                                {/* Footer */}
                                <div className="absolute bottom-5 left-0 right-0 flex justify-center opacity-20">
                                    <div className="text-[9px] font-mono tracking-[0.2em] uppercase text-white/40">
                                        Tap to Flip
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* BACK FACE */}
                        <div
                            className="absolute inset-0 rounded-[28px] bg-[#08080c] border border-emerald-500/20 overflow-hidden shadow-2xl"
                            style={{
                                backfaceVisibility: 'hidden',
                                WebkitBackfaceVisibility: 'hidden',
                                transform: 'rotateY(180deg)',
                            }}
                        >
                            <div className="w-full h-full p-5 flex flex-col items-center relative">
                                {/* Header */}
                                <div className="w-full flex justify-center opacity-40 text-emerald-400/50 mb-3">
                                    <div className="text-[9px] font-mono tracking-[0.3em] uppercase">
                                        Answer
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="w-full flex-1 overflow-y-auto flex items-center justify-center px-3">
                                    <p className="text-sm font-medium text-slate-200 leading-relaxed text-center">
                                        {currentCard.back}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Navigation + Reveal Button */}
            <div className="flex flex-col items-center gap-3">
                {/* Reveal Button */}
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); setIsFlipped(!isFlipped); }}
                    className="h-8 px-6 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 border border-white/10"
                >
                    {isFlipped ? 'SHOW QUESTION' : 'REVEAL ANSWER'}
                </Button>

                {/* Navigation */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); goPrev(); }}
                        disabled={currentIndex === 0}
                        className="size-8 rounded-full"
                    >
                        <ChevronLeft className="size-4" />
                    </Button>

                    <span className="text-sm text-muted-foreground font-mono min-w-[4ch] text-center">
                        {currentIndex + 1} / {cards.length}
                    </span>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); goNext(); }}
                        disabled={currentIndex === cards.length - 1}
                        className="size-8 rounded-full"
                    >
                        <ChevronRight className="size-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
