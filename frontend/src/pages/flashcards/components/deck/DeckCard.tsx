/**
 * DeckCard Component
 * Holographic deck pod with glassmorphic design
 */

import { motion } from 'framer-motion';
import { Play, MoreVertical, Edit, Trash2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Deck, DeckColor } from '../../types/flashcards.types';

interface DeckCardProps {
    deck: Deck;
    color: DeckColor;
    masteryPercent: number;
    onDelete: () => void;
    onEdit: () => void;
    onReview: () => void;
    onClick: () => void;
}

const colorClasses = {
    cyan: {
        border: 'border-cyan-500/30',
        hoverBorder: 'hover:border-cyan-400',
        gradient: 'from-cyan-500/10',
        dot: 'bg-cyan-400',
        text: 'text-cyan-400',
        progress: 'bg-cyan-500',
        button: 'bg-cyan-500',
        shadow: 'shadow-cyan-500/50',
    },
    purple: {
        border: 'border-purple-500/30',
        hoverBorder: 'hover:border-purple-400',
        gradient: 'from-purple-500/10',
        dot: 'bg-purple-400',
        text: 'text-purple-400',
        progress: 'bg-purple-500',
        button: 'bg-purple-500',
        shadow: 'shadow-purple-500/50',
    },
    red: {
        border: 'border-red-500/30',
        hoverBorder: 'hover:border-red-400',
        gradient: 'from-red-500/10',
        dot: 'bg-red-400',
        text: 'text-red-400',
        progress: 'bg-red-500',
        button: 'bg-red-500',
        shadow: 'shadow-red-500/50',
    },
    emerald: {
        border: 'border-emerald-500/30',
        hoverBorder: 'hover:border-emerald-400',
        gradient: 'from-emerald-500/10',
        dot: 'bg-emerald-400',
        text: 'text-emerald-400',
        progress: 'bg-emerald-500',
        button: 'bg-emerald-500',
        shadow: 'shadow-emerald-500/50',
    },
    amber: {
        border: 'border-amber-500/30',
        hoverBorder: 'hover:border-amber-400',
        gradient: 'from-amber-500/10',
        dot: 'bg-amber-400',
        text: 'text-amber-400',
        progress: 'bg-amber-500',
        button: 'bg-amber-500',
        shadow: 'shadow-amber-500/50',
    },
    blue: {
        border: 'border-blue-500/30',
        hoverBorder: 'hover:border-blue-400',
        gradient: 'from-blue-500/10',
        dot: 'bg-blue-400',
        text: 'text-blue-400',
        progress: 'bg-blue-500',
        button: 'bg-blue-500',
        shadow: 'shadow-blue-500/50',
    },
};

export function DeckCard({
    deck,
    color,
    masteryPercent,
    onDelete,
    onEdit,
    onReview,
    onClick,
}: DeckCardProps) {
    const colors = colorClasses[color];

    return (
        <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onClick={onClick}
            className={`synapse-panel group relative cursor-pointer h-48 rounded-xl overflow-hidden flex flex-col p-6 transition-all ${colors.border} ${colors.hoverBorder} hover:shadow-[0_0_30px_rgba(0,0,0,0.5)]`}
        >
            {/* Gradient Overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} via-transparent to-transparent opacity-30`} />

            {/* Dropdown Menu - Top Left (visible on hover) */}
            <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 bg-black/60 hover:bg-black/80 border border-white/5"
                        >
                            <MoreVertical className="h-3 w-3 text-white" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="start"
                        className="bg-[rgba(10,10,10,0.95)] backdrop-blur-xl border-white/5"
                    >
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                onReview();
                            }}
                            className="text-white"
                        >
                            <Play className="mr-2 h-4 w-4" />
                            Review
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit();
                            }}
                            className="text-white"
                        >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                            className="text-red-400 focus:text-red-300"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col justify-between">
                <div>
                    <h3 className="text-xl font-bold text-white mb-1 font-serif tracking-wide line-clamp-2">
                        {deck.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                        <Layers size={12} />
                        {deck.card_count || 0} Fragments
                    </div>
                </div>

                {/* Mastery Progress */}
                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest text-slate-500">
                        <span>Sync Status</span>
                        <span className={colors.text}>{masteryPercent}%</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${masteryPercent}%` }}
                            transition={{ duration: 1, delay: 0.2 }}
                            className={`h-full ${colors.progress} shadow-[0_0_10px_currentColor]`}
                        />
                    </div>
                </div>
            </div>

            {/* Hover Play Button Overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onReview();
                    }}
                    className={`p-4 rounded-full ${colors.button} text-white shadow-lg ${colors.shadow} scale-0 group-hover:scale-100 transition-transform duration-300`}
                >
                    <Play size={24} fill="currentColor" />
                </button>
            </div>
        </motion.div>
    );
}
