/**
 * DeckCard Component
 * 
 * Solid dark card design for deck display.
 * 
 * @visual-constraints (per FLASHCARDS_ARCHITECTURE.md)
 * - No gradients
 * - No backdrop-filter / blur
 * - No opacity layers > 0.95
 * - Solid background: bg-[#0a0a0f]
 * - Single subtle border
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
    Play,
    MoreVertical,
    Edit,
    Trash2,
    Layers,
    Zap,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Deck } from '../../core';

interface DeckCardProps {
    deck: Deck;
    masteryPercent?: number;
    dueCount?: number;
    onDelete: () => void;
    onEdit: () => void;
    onReview: () => void;
    onClick: () => void;
}

// Color accent based on mastery
function getAccentColor(masteryPercent: number): string {
    if (masteryPercent >= 80) return 'text-emerald-400 border-emerald-500/30';
    if (masteryPercent >= 50) return 'text-cyan-400 border-cyan-500/30';
    if (masteryPercent >= 30) return 'text-amber-400 border-amber-500/30';
    return 'text-red-400 border-red-500/30';
}

export const DeckCard = React.memo(function DeckCard({
    deck,
    masteryPercent = 0,
    dueCount = 0,
    onDelete,
    onEdit,
    onReview,
    onClick,
}: DeckCardProps) {
    const accentColor = getAccentColor(masteryPercent);
    const accentClass = accentColor.split(' ')[0];
    const borderClass = accentColor.split(' ')[1];

    // Mastery ring calculations
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (masteryPercent / 100) * circumference;

    return (
        <motion.div
            onClick={onClick}
            whileHover={{ y: -4 }}
            className={`
        group h-72 rounded-2xl cursor-pointer
        bg-[#0a0a0f] border border-white/10
        hover:border-white/20
        transition-colors duration-200
        flex flex-col overflow-hidden
      `}
        >
            {/* Header with mastery ring */}
            <div className="h-[45%] flex items-center justify-center relative border-b border-white/5">
                {/* Actions dropdown */}
                <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button className="h-8 w-8 rounded-full flex items-center justify-center bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors">
                                <MoreVertical size={16} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            className="bg-[#0a0a0f] border-white/10 text-slate-200"
                        >
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit();
                                }}
                            >
                                <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete();
                                }}
                                className="text-red-400"
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Mastery ring */}
                <div className="relative w-20 h-20 flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                        {/* Track */}
                        <circle
                            cx="40"
                            cy="40"
                            r={radius}
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="4"
                            fill="transparent"
                        />
                        {/* Progress */}
                        <circle
                            cx="40"
                            cy="40"
                            r={radius}
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            className={`${accentClass} transition-all duration-700`}
                        />
                    </svg>
                    <span className={`font-mono text-lg font-bold ${accentClass}`}>
                        {masteryPercent}%
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-5 py-4 flex flex-col justify-between">
                <div className="text-center">
                    <h3 className="text-base font-bold text-white mb-1 line-clamp-1 group-hover:text-cyan-400 transition-colors">
                        {deck.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 h-8">
                        {deck.description || 'No description'}
                    </p>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-center gap-4 text-[10px] font-medium text-slate-500 uppercase tracking-wider pt-2 border-t border-white/5">
                    <div className="flex items-center gap-1.5">
                        <Layers size={12} className="text-slate-400" />
                        {deck.card_count || 0} cards
                    </div>
                    <div className="w-1 h-1 rounded-full bg-slate-700" />
                    <div className="flex items-center gap-1.5">
                        <Zap size={12} className="text-amber-400" />
                        {dueCount} due
                    </div>
                </div>

                {/* Review button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onReview();
                    }}
                    className={`
            w-full mt-3 py-2.5 rounded-xl
            flex items-center justify-center gap-2
            bg-white/5 border ${borderClass}
            text-sm font-bold ${accentClass}
            hover:bg-white/10 transition-colors
          `}
                >
                    <Play size={14} className="fill-current" />
                    Review
                </button>
            </div>
        </motion.div>
    );
});
