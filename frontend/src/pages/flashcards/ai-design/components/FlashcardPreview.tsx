/**
 * FlashcardPreview — compact flippable card tile.
 *
 * Used in the AI Card Designer post-generation inline preview.
 * Shows the front by default; click to flip and reveal back.
 * Sized to stack 2-across in the chat column (max-w ~200px).
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface PreviewCard {
    id: number;
    front_text: string;
    back_text: string;
    card_type: string;
    cloze_answer?: string;
}

// Render cloze blanks: replace __ with a styled inline element
function renderClozeText(text: string): React.ReactNode {
    const parts = text.split('__');
    if (parts.length <= 1) return text;
    return parts.map((part, i) =>
        i < parts.length - 1 ? (
            <span key={i}>
                {part}
                <span className="inline-block min-w-[3rem] border-b-2 border-violet-400 bg-violet-400/10 rounded-sm px-1 mx-0.5 text-violet-400/0 select-none">&nbsp;&nbsp;&nbsp;&nbsp;</span>
            </span>
        ) : part
    );
}

interface FlashcardPreviewProps {
    card: PreviewCard;
}

export function FlashcardPreview({ card }: FlashcardPreviewProps) {
    const [flipped, setFlipped] = useState(false);

    return (
        <div
            className="relative w-[160px] h-[110px] cursor-pointer shrink-0"
            style={{ perspective: '800px' }}
            onClick={() => setFlipped((f) => !f)}
            title="Click to flip"
        >
            <motion.div
                className="w-full h-full relative"
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                style={{ transformStyle: 'preserve-3d' }}
            >
                {/* Front */}
                <div
                    className={cn(
                        'absolute inset-0 rounded-xl border border-border bg-card px-3 py-2.5 flex flex-col justify-between',
                        'backface-hidden',
                    )}
                    style={{ backfaceVisibility: 'hidden' }}
                >
                    <p className="text-xs text-foreground leading-relaxed line-clamp-3 flex-1">
                        {card.card_type === 'cloze'
                            ? renderClozeText(card.front_text)
                            : card.front_text}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Front</span>
                        <span className="text-[9px] text-primary/60">tap to flip →</span>
                    </div>
                </div>

                {/* Back */}
                <div
                    className="absolute inset-0 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 flex flex-col justify-between"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                    <p className="text-xs text-foreground leading-relaxed line-clamp-3 flex-1">
                        {card.back_text}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Back</span>
                        <span className="text-[9px] text-muted-foreground/50">← flip back</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
