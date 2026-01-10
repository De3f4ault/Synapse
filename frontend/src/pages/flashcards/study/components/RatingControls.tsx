/**
 * RatingControls Component
 * 
 * SM-2 rating buttons (Again, Hard, Good, Easy).
 * Uses ReviewRating (0-3) for type safety.
 */

import { motion } from 'framer-motion';
import { RotateCcw, Frown, Meh, Smile } from 'lucide-react';
import { type ReviewRating } from '../../core';

interface RatingControlsProps {
    onRate: (rating: ReviewRating) => void;
    disabled?: boolean;
}

const BUTTONS: Array<{
    rating: ReviewRating;
    label: string;
    icon: typeof RotateCcw;
    color: string;
    hoverBg: string;
    key: string;
}> = [
        {
            rating: 0,
            label: 'AGAIN',
            icon: RotateCcw,
            color: 'text-red-400',
            hoverBg: 'hover:bg-red-500/10',
            key: '1',
        },
        {
            rating: 1,
            label: 'HARD',
            icon: Frown,
            color: 'text-amber-400',
            hoverBg: 'hover:bg-amber-500/10',
            key: '2',
        },
        {
            rating: 2,
            label: 'GOOD',
            icon: Meh,
            color: 'text-cyan-400',
            hoverBg: 'hover:bg-cyan-500/10',
            key: '3',
        },
        {
            rating: 3,
            label: 'EASY',
            icon: Smile,
            color: 'text-emerald-400',
            hoverBg: 'hover:bg-emerald-500/10',
            key: '4',
        },
    ];

export function RatingControls({ onRate, disabled = false }: RatingControlsProps) {
    return (
        <div className="flex justify-center gap-6 w-full max-w-2xl mx-auto">
            {BUTTONS.map((btn, index) => {
                const Icon = btn.icon;
                return (
                    <motion.button
                        key={btn.rating}
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 20 }}
                        onClick={() => onRate(btn.rating)}
                        disabled={disabled}
                        className={`
              group relative
              w-16 h-16 md:w-20 md:h-20 rounded-full
              flex items-center justify-center
              bg-[#0a0a0f] border border-white/5
              transition-all duration-300
              ${btn.hoverBg}
              hover:border-white/20 hover:scale-110 hover:shadow-xl hover:shadow-${btn.color.split('-')[1]}-500/20
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
                    >
                        <div className={`absolute inset-0 rounded-full opacity-0 group-hover:opacity-10 transition-opacity bg-current ${btn.color}`} />
                        <Icon size={24} className={btn.color} />

                        {/* Tooltip-style Label */}
                        <div className="absolute -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                {btn.label} <span className="text-slate-700">({btn.key})</span>
                            </span>
                        </div>
                    </motion.button>
                );
            })}
        </div>
    );
}
