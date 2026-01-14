/**
 * DeckCard Component
 * 
 * Glassy card design matching NoteCard and QuizCard styling.
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
    BrainCircuit,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GlassCard } from '@/shared/ui';
import { cn } from '@/lib/utils';
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

// Color accent based on mastery - using same cyan-centric palette as Notes/Quizzes
function getMasteryBadge(masteryPercent: number): { text: string; className: string } {
    if (masteryPercent >= 80) return { text: 'Mastered', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    if (masteryPercent >= 50) return { text: 'Learning', className: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' };
    if (masteryPercent >= 30) return { text: 'Started', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
    return { text: 'New', className: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
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
    const badge = getMasteryBadge(masteryPercent);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ duration: 0.2 }}
            onClick={onClick}
            className="group cursor-pointer h-64"
        >
            <GlassCard className="h-full p-6 flex flex-col relative overflow-hidden">
                {/* Background Glow - matching NoteCard */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-[50px] rounded-full group-hover:bg-cyan-500/20 transition-all duration-500" />

                {/* Header */}
                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="p-2.5 rounded-xl bg-cyan-500/5 border border-cyan-500/10 text-cyan-400">
                        <BrainCircuit size={20} />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "px-3 py-1 rounded-full text-xs font-medium border capitalize",
                            badge.className
                        )}>
                            {badge.text}
                        </span>
                        {/* Actions dropdown */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <button className="h-7 w-7 rounded-full flex items-center justify-center bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors">
                                        <MoreVertical size={14} />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="bg-zinc-900 border-white/10 text-slate-200"
                                >
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-red-400">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 relative z-10">
                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-1 group-hover:text-cyan-300 transition-colors">
                        {deck.name}
                    </h3>
                    <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">
                        {deck.description || 'No description provided.'}
                    </p>
                </div>


                {/* Footer Stats - matching NoteCard/QuizCard */}
                <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-4 text-xs font-mono text-slate-600">
                        <span className="flex items-center gap-1.5">
                            <Layers size={12} className="text-slate-500" />
                            {deck.card_count || 0} cards
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Zap size={12} className="text-amber-400" />
                            {dueCount} due
                        </span>
                    </div>

                    <motion.button
                        onClick={(e) => { e.stopPropagation(); onReview(); }}
                        className="p-2 rounded-full bg-cyan-500/10 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <Play size={14} fill="currentColor" />
                    </motion.button>
                </div>
            </GlassCard>
        </motion.div>
    );
});

