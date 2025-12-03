/**
 * CardFlip Component
 * 3D flip animation for flashcard review
 */

import { motion } from 'framer-motion';
import { Brain, Zap } from 'lucide-react';
import type { Flashcard } from '../../types/flashcards.types';

interface CardFlipProps {
    card: Flashcard;
    isFlipped: boolean;
    onFlip: () => void;
}

export function CardFlip({ card, isFlipped, onFlip }: CardFlipProps) {
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
        className="absolute inset-0 rounded-3xl bg-[rgba(8,10,14,0.9)] backdrop-blur-xl border border-white/5 shadow-2xl flex flex-col items-center justify-center p-12 text-center overflow-hidden"
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
        className="absolute inset-0 rounded-3xl bg-[rgba(10,12,18,0.9)] backdrop-blur-xl border border-purple-500/30 shadow-[0_0_50px_rgba(168,85,247,0.15)] flex flex-col items-center justify-center p-12 text-center overflow-hidden"
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
