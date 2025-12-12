/**
 * ItemCard - Display component for study items
 */

import { Clock, TrendingUp, AlertCircle, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import type { StudyItem } from '../../types/study.types';
import { cn } from '@/lib/utils';

interface ItemCardProps {
    item: StudyItem;
    onClick?: () => void;
    selected?: boolean;
}

export function ItemCard({ item, onClick, selected }: ItemCardProps) {
    const isOverdue = item.priority === 'high';
    const isNew = item.priority === 'new';

    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="h-full"
        >
            <div
                onClick={onClick}
                className={cn(
                    "cursor-pointer h-full relative p-6 rounded-xl flex flex-col transition-all duration-300",
                    // Base styles
                    "bg-[#0F1115] border border-white/5 shadow-lg",
                    // Hover styles
                    "hover:border-cyan-500/30 hover:shadow-cyan-500/10",
                    // Selected styles
                    selected
                        ? "border-cyan-500 bg-cyan-950/10 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/50"
                        : ""
                )}
            >
                {/* Selection Indicator */}
                {selected && (
                    <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                )}

                <div className="space-y-4 flex-1">
                    {/* Header with type and priority */}
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className={cn(
                                    "px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border",
                                    item.type === 'flashcard'
                                        ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                        : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                )}>
                                    {item.type}
                                </span>
                                {isOverdue && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
                                        <AlertCircle size={10} />
                                        Overdue
                                    </span>
                                )}
                                {isNew && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        <Sparkles size={10} />
                                        New
                                    </span>
                                )}
                            </div>
                            <h4 className="font-bold text-white text-lg line-clamp-2 leading-tight group-hover:text-cyan-400 transition-colors">
                                {item.title}
                            </h4>
                        </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-mono text-slate-500">
                        {item.estimatedTime && (
                            <div className="flex items-center gap-1.5">
                                <Clock size={12} className="text-cyan-500/70" />
                                {item.estimatedTime}m
                            </div>
                        )}
                        {typeof item.masteryLevel === 'number' && (
                            <div className="flex items-center gap-1.5">
                                <TrendingUp size={12} className="text-cyan-500/70" />
                                {item.masteryLevel}% mastery
                            </div>
                        )}
                        {item.difficulty && (
                            <div className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                                {getDifficultyLabel(item.difficulty)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer / Progress */}
                <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                    {/* Mastery Progress Bar */}
                    {typeof item.masteryLevel === 'number' && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] uppercase font-bold tracking-wider text-slate-500">
                                <span>Mastery</span>
                                <span>{item.masteryLevel}%</span>
                            </div>
                            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className={cn("h-full transition-all duration-500", getMasteryColor(item.masteryLevel))}
                                    style={{ width: `${item.masteryLevel}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Due date info */}
                    {item.dueDate && (
                        <p className="text-[10px] text-right font-mono text-slate-600">
                            {isOverdue ? 'Was due' : 'Due'} <span className={isOverdue ? 'text-red-400' : 'text-slate-400'}>{formatDueDate(item.dueDate)}</span>
                        </p>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

function getDifficultyLabel(difficulty: number): string {
    const labels: Record<number, string> = {
        1: 'Very Easy',
        2: 'Easy',
        3: 'Medium',
        4: 'Hard',
        5: 'Very Hard',
    };
    return labels[difficulty] || 'Medium';
}

function getMasteryColor(mastery: number): string {
    if (mastery >= 80) return 'bg-emerald-500';
    if (mastery >= 60) return 'bg-blue-500';
    if (mastery >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
}

function formatDueDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        const absDays = Math.abs(diffDays);
        if (absDays === 0) return 'today';
        if (absDays === 1) return 'yesterday';
        return `${absDays}d ago`;
    }

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'tomorrow';
    if (diffDays < 7) return `in ${diffDays}d`;
    return date.toLocaleDateString();
}
