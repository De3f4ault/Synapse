/**
 * DifficultyButtons Component
 * Review quality rating buttons (Again, Hard, Good, Easy)
 */

import { motion } from 'framer-motion';
import { RotateCcw, Frown, Meh, Smile } from 'lucide-react';
import type { ReviewQuality } from '../../types/flashcards.types';

interface DifficultyButtonsProps {
    onReview: (quality: ReviewQuality) => void;
    disabled?: boolean;
}

const buttons = [
    { quality: 'again' as ReviewQuality, label: 'AGAIN', icon: RotateCcw, color: 'red', key: '1' },
{ quality: 'hard' as ReviewQuality, label: 'HARD', icon: Frown, color: 'amber', key: '2' },
{ quality: 'good' as ReviewQuality, label: 'GOOD', icon: Meh, color: 'cyan', key: '3' },
{ quality: 'easy' as ReviewQuality, label: 'EASY', icon: Smile, color: 'emerald', key: '4' },
];

export function DifficultyButtons({ onReview, disabled = false }: DifficultyButtonsProps) {
    return (
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="flex gap-4 w-full max-w-3xl"
        >
        {buttons.map((btn, index) => {
            const Icon = btn.icon;
            const colorClasses = {
                red: 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20',
                amber: 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20',
                cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20',
                emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20',
            };

            return (
                <motion.button
                key={btn.quality}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => onReview(btn.quality)}
                disabled={disabled}
                className={`flex-1 px-6 py-4 rounded-lg border transition-all font-bold text-xs uppercase tracking-widest flex flex-col items-center gap-2 ${
                    colorClasses[btn.color as keyof typeof colorClasses]
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                <Icon size={20} />
                {btn.label}
                <kbd className="text-[10px] opacity-60">({btn.key})</kbd>
                </motion.button>
            );
        })}
        </motion.div>
    );
}
