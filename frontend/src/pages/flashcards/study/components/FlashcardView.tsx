import { motion } from 'framer-motion';
import { MarkdownRenderer } from '@/shared/rendering';
import type { Flashcard } from '../../core';

interface FlashcardViewProps {
    card: Flashcard;
    isFlipped: boolean;
    onFlip: () => void;
}

/**
 * Tailwind arbitrary-variant classes to override prose defaults inside cards.
 * Using [&_X]: syntax generates real CSS with proper specificity — more reliable
 * than injecting a <style> tag into the component tree.
 */
const FRONT_PROSE_CLASS = [
    // Paragraphs: large, bold, centered
    '[&_p]:text-center [&_p]:text-xl [&_p]:font-bold [&_p]:leading-snug [&_p]:text-foreground [&_p]:my-1',
    // Headings: same as paragraphs for card context
    '[&_h1]:text-center [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-foreground [&_h1]:my-1',
    '[&_h2]:text-center [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:my-1',
    '[&_h3]:text-center [&_h3]:text-lg  [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:my-1',
    // Lists: centered block
    '[&_ul]:text-left [&_ol]:text-left',
    // KaTeX
    '[&_.katex-display]:text-center [&_.katex-display]:my-3',
].join(' ');

const BACK_PROSE_CLASS = [
    // Paragraphs: moderate, centered
    '[&_p]:text-center [&_p]:text-base [&_p]:font-medium [&_p]:leading-relaxed [&_p]:text-foreground/75 [&_p]:my-1.5',
    // Headings
    '[&_h1]:text-center [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-foreground [&_h1]:my-1',
    '[&_h2]:text-center [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:my-1',
    '[&_h3]:text-center [&_h3]:text-sm  [&_h3]:font-medium  [&_h3]:text-foreground [&_h3]:my-1',
    // Lists: left-aligned is fine in answers
    '[&_ul]:text-left [&_ol]:text-left [&_li]:text-foreground/70',
    // KaTeX
    '[&_.katex-display]:text-center [&_.katex-display]:my-3',
].join(' ');

export function FlashcardView({ card, isFlipped, onFlip }: FlashcardViewProps) {
    const frontLabel: Record<string, string> = {
        basic:    'Query',
        cloze:    'Fill in the blank',
        socratic: 'Reasoning',
        scenario: 'Scenario',
    };
    const cardLabel = frontLabel[card.card_type ?? 'basic'] ?? 'Query';

    return (
        <div
            className="w-full h-full flex justify-center items-center perspective-[1200px]"
            onClick={onFlip}
        >
            {/*
             * Height-driven card: h-full fills the flex container,
             * aspect-[9/16] then derives the width (= height * 9/16).
             * This prevents vertical overflow regardless of container height.
             */}
            <motion.div
                className="relative h-full aspect-[9/16]"
                style={{ transformStyle: 'preserve-3d' }}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            >
                {/* ─────────── FRONT FACE ─────────── */}
                <div
                    className="absolute inset-0 rounded-[36px] bg-popover border border-border overflow-hidden shadow-2xl"
                    style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(0deg)',
                        zIndex: 2,
                    }}
                >
                    <div className="relative w-full h-full flex flex-col group">
                        {/* Label */}
                        <div className="absolute top-6 inset-x-0 flex justify-center opacity-25 group-hover:opacity-50 transition-opacity z-10 pointer-events-none">
                            <span className="text-[10px] font-mono tracking-[0.3em] uppercase select-none">{cardLabel}</span>
                        </div>

                        {/* Content — scrollable, centered */}
                        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-8 pt-16 pb-14 flex flex-col items-center justify-center">
                            <MarkdownRenderer
                                content={card.front_text}
                                className={FRONT_PROSE_CLASS}
                            />
                        </div>

                        {/* Tap hint */}
                        <div className="absolute bottom-5 inset-x-0 flex justify-center opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none">
                            <span className="text-[10px] font-mono tracking-[0.2em] uppercase select-none">Tap to Flip</span>
                        </div>
                    </div>
                </div>

                {/* ─────────── BACK FACE ─────────── */}
                <div
                    className="absolute inset-0 rounded-[36px] bg-muted border border-border/60 overflow-hidden shadow-2xl"
                    style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                    }}
                >
                    <div className="relative w-full h-full flex flex-col">
                        {/* Label */}
                        <div className="shrink-0 pt-6 pb-2 flex justify-center opacity-40 pointer-events-none">
                            <span className="text-[10px] font-mono tracking-[0.3em] uppercase select-none">Answer</span>
                        </div>

                        {/*
                         * Content — scrollable with a soft fade-out mask at the bottom
                         * so the user knows there's more to scroll.
                         * Flex col + items-center keeps content horizontally centered.
                         * justify-center keeps short answers vertically centered.
                         */}
                        <div
                            className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-6 pb-8 flex flex-col items-center justify-center"
                            style={{
                                WebkitMaskImage: 'linear-gradient(to bottom, black 82%, transparent 100%)',
                                maskImage: 'linear-gradient(to bottom, black 82%, transparent 100%)',
                            }}
                        >
                            <MarkdownRenderer
                                content={card.back_text}
                                className={BACK_PROSE_CLASS}
                            />
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
