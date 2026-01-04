// ... FlashcardView Component ...
import { motion } from 'framer-motion';
import type { Flashcard } from '../../core';

interface FlashcardViewProps {
    card: Flashcard;
    isFlipped: boolean;
    onFlip: () => void;
}

export function FlashcardView({ card, isFlipped, onFlip }: FlashcardViewProps) {
    return (
        <div
            className="w-full h-full flex justify-center items-center perspective-[1200px]"
            onClick={onFlip}
        >
            <motion.div
                className="relative w-full max-w-[420px] aspect-[9/16]"
                style={{ transformStyle: 'preserve-3d' }}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            >
                {/* FRONT FACE */}
                <div
                    className="absolute inset-0 rounded-[40px] bg-[#0a0a0f] border border-white/10 overflow-hidden shadow-2xl"
                    style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden', // Safari support
                        transform: 'rotateY(0deg)',
                        zIndex: 2
                    }}
                >
                    <div className="w-full h-full p-8 flex flex-col items-center justify-center relative group hover:border-white/20 transition-colors duration-300">
                        {/* Subtle Header */}
                        <div className="absolute top-8 left-0 right-0 flex justify-center opacity-30 group-hover:opacity-60 transition-opacity">
                            <div className="text-[10px] font-mono tracking-[0.3em] uppercase">Query</div>
                        </div>

                        {/* Content */}
                        <div className="w-full text-center space-y-6 z-10">
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-100 leading-tight">
                                {card.front_text}
                            </h2>
                        </div>

                        {/* Footer Hint */}
                        <div className="absolute bottom-8 left-0 right-0 flex justify-center opacity-20 group-hover:opacity-40 transition-opacity">
                            <div className="text-[10px] font-mono tracking-[0.2em] uppercase">Tap to Flip</div>
                        </div>
                    </div>
                </div>

                {/* BACK FACE */}
                <div
                    className="absolute inset-0 rounded-[40px] bg-[#08080c] border border-emerald-500/20 overflow-hidden shadow-2xl"
                    style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)'
                    }}
                >
                    <div className="w-full h-full p-6 flex flex-col items-center relative">
                        {/* Subtle Header */}
                        <div className="w-full flex justify-center opacity-40 text-emerald-400/50 mb-4 shrink-0">
                            <div className="text-[10px] font-mono tracking-[0.3em] uppercase">Answer</div>
                        </div>

                        {/* Content */}
                        <div className="w-full flex-1 overflow-y-auto no-scrollbar mask-gradient-b flex items-center justify-center">
                            <style>{`
                                .mask-gradient-b {
                                    -webkit-mask-image: linear-gradient(to bottom, black 90%, transparent 100%);
                                    mask-image: linear-gradient(to bottom, black 90%, transparent 100%);
                                }
                            `}</style>
                            <p className="text-lg md:text-xl font-medium text-slate-200 leading-relaxed text-center px-2">
                                {card.back_text}
                            </p>
                        </div>

                        {/* Scroll hint (only visible if content overflows - tricky to detect with CSS alone, 
                            so we just leave space at bottom) */}
                        <div className="h-6 shrink-0" />
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

