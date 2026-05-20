/**
 * ChatFlashcardSet - Grok-Style Inline Flashcard Preview
 *
 * Design: Seamless integration with AI messages
 * - Side navigation arrows (left/right of card)
 * - Minimal header with Save button
 * - Click card to flip
 * - No borders on container - blends with AI message
 *
 * INVARIANT: Preview-only. No SM-2 mutation.
 * INVARIANT: Save is explicit and user-initiated.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Save, Layers, BookOpen } from 'lucide-react';
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
    const navigate = useNavigate();

    const currentCard = cards[currentIndex];
    if (!currentCard || cards.length === 0) {
        return (
            <div className="p-4 text-center text-muted-foreground">
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

    const handleStudyNow = () => {
        // Navigate to flashcards study page
        // In the future, we can create a temp deck and pass the cards
        navigate('/flashcards');
    };

    return (
        <div className="my-4 space-y-3">
            {/* Header - Minimal, blends with AI message */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                        <Layers className="size-4 text-primary" />
                    </div>
                    <div>
                        <span className="font-medium text-sm text-foreground">{title}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                            ({cards.length} cards)
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {onSave && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onSave(cards)}
                            className="h-7 text-xs gap-1.5 border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-colors"
                        >
                            <Save className="size-3" />
                            Save to Deck
                        </Button>
                    )}
                    <Button
                        variant="default"
                        size="sm"
                        onClick={handleStudyNow}
                        className="h-7 text-xs gap-1.5 bg-primary hover:bg-primary transition-colors"
                    >
                        <BookOpen className="size-3" />
                        Study Now
                    </Button>
                </div>
            </div>

            {/* Card with Side Navigation */}
            <div className="flex items-center justify-center gap-2">
                {/* Left Arrow */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); goPrev(); }}
                    disabled={currentIndex === 0}
                    className="size-10 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-20 shrink-0"
                >
                    <ChevronLeft className="size-5" />
                </Button>

                {/* Card Container */}
                <div
                    className="w-full max-w-[260px] aspect-[9/14] cursor-pointer"
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
                            className="absolute inset-0 rounded-2xl bg-popover border border-border overflow-hidden"
                            style={{
                                backfaceVisibility: 'hidden',
                                WebkitBackfaceVisibility: 'hidden',
                                transform: 'rotateY(0deg)',
                            }}
                        >
                            <div className="w-full h-full p-5 flex flex-col items-center justify-center relative">
                                {/* Header */}
                                <div className="absolute top-4 left-0 right-0 flex justify-center opacity-30">
                                    <div className="text-[9px] font-mono tracking-[0.3em] uppercase text-foreground/60">
                                        Question
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="w-full text-center px-4">
                                    <p className="text-sm font-medium text-foreground leading-relaxed">
                                        {currentCard.front}
                                    </p>
                                </div>

                                {/* Footer */}
                                <div className="absolute bottom-4 left-0 right-0 flex justify-center opacity-20">
                                    <div className="text-[8px] font-mono tracking-[0.2em] uppercase text-foreground/40">
                                        Tap to Flip
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* BACK FACE */}
                        <div
                            className="absolute inset-0 rounded-2xl bg-muted border border-accent-olive/10 overflow-hidden"
                            style={{
                                backfaceVisibility: 'hidden',
                                WebkitBackfaceVisibility: 'hidden',
                                transform: 'rotateY(180deg)',
                            }}
                        >
                            <div className="w-full h-full p-5 flex flex-col items-center relative">
                                {/* Header */}
                                <div className="w-full flex justify-center opacity-40 text-accent-olive/50 mb-3">
                                    <div className="text-[9px] font-mono tracking-[0.3em] uppercase">
                                        Answer
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="w-full flex-1 overflow-y-auto flex items-center justify-center px-3">
                                    <p className="text-sm font-medium text-foreground/70 leading-relaxed text-center">
                                        {currentCard.back}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Right Arrow */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); goNext(); }}
                    disabled={currentIndex === cards.length - 1}
                    className="size-10 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-20 shrink-0"
                >
                    <ChevronRight className="size-5" />
                </Button>
            </div>

            {/* Card Counter - Minimal */}
            <div className="flex justify-center">
                <span className="text-xs text-muted-foreground font-mono">
                    {currentIndex + 1} / {cards.length}
                </span>
            </div>
        </div>
    );
}
