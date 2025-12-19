/**
 * DifficultyButtons Component
 * Review quality rating buttons (Again, Hard, Good, Easy)
 */

import { motion } from 'framer-motion';
import { RotateCcw, Frown, Meh, Smile } from 'lucide-react';
import type { ReviewQuality } from '../../types/flashcards.types';
import { NeumorphicButton } from '@/components/neumorphic';

interface DifficultyButtonsProps {
    onReview: (quality: ReviewQuality) => void;
    disabled?: boolean;
}

const buttons = [
    { quality: 'again' as ReviewQuality, label: 'AGAIN', icon: RotateCcw, color: 'text-red-400', key: '1' },
    { quality: 'hard' as ReviewQuality, label: 'HARD', icon: Frown, color: 'text-amber-400', key: '2' },
    { quality: 'good' as ReviewQuality, label: 'GOOD', icon: Meh, color: 'text-cyan-400', key: '3' },
    { quality: 'easy' as ReviewQuality, label: 'EASY', icon: Smile, color: 'text-emerald-400', key: '4' },
];

export function DifficultyButtons({ onReview, disabled = false }: DifficultyButtonsProps) {
    return (
        <div className="flex gap-4 w-full">
            {buttons.map((btn, index) => {
                const Icon = btn.icon;
                return (
                    <motion.div
                        key={btn.quality}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex-1"
                    >
                        <NeumorphicButton
                            onClick={() => onReview(btn.quality)}
                            disabled={disabled}
                            className={`w-full h-auto py-4 flex flex-col items-center gap-2 ${btn.color}`}
                        >
                            <Icon size={24} />
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors">
                                {btn.label}
                            </span>
                            <kbd className="hidden md:inline-block text-[10px] font-mono text-slate-600 bg-black/20 px-2 py-0.5 rounded">
                                {btn.key}
                            </kbd>
                        </NeumorphicButton>
                    </motion.div>
                );
            })}
        </div>
    );
}
