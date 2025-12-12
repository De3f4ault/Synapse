import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Tag, Clock, TrendingUp, Zap, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { NoteResponse } from '@/api/generated';

interface NoteStatsProps {
    notes: NoteResponse[];
}

/**
 * Neural Analytics Dashboard - Synapse Creative Edition
 * Real-time statistics with animated metrics and insights
 */
export const NoteStats: React.FC<NoteStatsProps> = ({ notes }) => {
    const stats = {
        total: notes.length,
        withTags: notes.filter((n) => n.tags && n.tags.length > 0).length,
        totalTags: new Set(notes.flatMap((n) => n.tags || [])).size,
        recentlyUpdated: notes.filter((n) => {
            const daysSinceUpdate = Math.floor(
                (Date.now() - new Date(n.updated_at).getTime()) / (1000 * 60 * 60 * 24)
            );
            return daysSinceUpdate <= 7;
        }).length,
        totalWords: notes.reduce((sum, n) => {
            const words = n.content ? n.content.trim().split(/\s+/).length : 0;
            return sum + words;
        }, 0),
        avgWordsPerNote: Math.round(
            notes.reduce((sum, n) => {
                const words = n.content ? n.content.trim().split(/\s+/).length : 0;
                return sum + words;
            }, 0) / (notes.length || 1)
        ),
    };

    const statCards = [
        {
            label: 'Total Fragments',
            value: stats.total,
            icon: FileText,
            color: 'text-[var(--synapse-cyan)]',
            bgColor: 'bg-[var(--synapse-cyan)]/10',
            borderColor: 'border-[var(--synapse-cyan)]/20',
            subtitle: `${stats.avgWordsPerNote} avg words`,
            trend: '+12%',
        },
        {
            label: 'Active This Week',
            value: stats.recentlyUpdated,
            icon: TrendingUp,
            color: 'text-[var(--synapse-emerald)]',
            bgColor: 'bg-[var(--synapse-emerald)]/10',
            borderColor: 'border-[var(--synapse-emerald)]/20',
            subtitle: 'Last 7 days',
            trend: '+8%',
        },
        {
            label: 'Neural Tags',
            value: stats.totalTags,
            icon: Tag,
            color: 'text-[var(--synapse-purple)]',
            bgColor: 'bg-[var(--synapse-purple)]/10',
            borderColor: 'border-[var(--synapse-purple)]/20',
            subtitle: `${stats.withTags} tagged`,
            trend: '+3',
        },
        {
            label: 'Total Words',
            value: stats.totalWords.toLocaleString(),
            icon: Zap,
            color: 'text-[var(--synapse-amber)]',
            bgColor: 'bg-[var(--synapse-amber)]/10',
            borderColor: 'border-[var(--synapse-amber)]/20',
            subtitle: `~${Math.ceil(stats.totalWords / 200)}min read`,
            trend: '+2.4k',
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
                <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                >
                <Card
                className={cn(
                    "bg-[var(--synapse-panel-bg)] border transition-all duration-300 overflow-hidden group hover:bg-[var(--synapse-panel-hover)] cursor-pointer relative",
                              stat.borderColor
                )}
                >
                {/* Animated background pattern */}
                <motion.div
                animate={{
                    backgroundPosition: ['0% 0%', '100% 100%'],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: 'linear',
                }}
                className="absolute inset-0 opacity-5"
                style={{
                    backgroundImage: `
                    linear-gradient(45deg, currentColor 25%, transparent 25%),
                    linear-gradient(-45deg, currentColor 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, currentColor 75%),
                    linear-gradient(-45deg, transparent 75%, currentColor 75%)
                    `,
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                }}
                />

                {/* Hover glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <CardContent className="p-5 relative z-10">
                <div className="flex items-start justify-between mb-4">
                {/* Icon with pulse animation */}
                <motion.div
                animate={{
                    scale: [1, 1.05, 1],
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
                className={cn(
                    "p-3 rounded-xl border backdrop-blur-sm",
                    stat.bgColor,
                    stat.borderColor
                )}
                >
                <Icon size={20} className={stat.color} />
                </motion.div>

                {/* Trend indicator */}
                <div className="flex items-center gap-1 px-2 py-1 bg-[var(--synapse-panel-bg)] border border-[var(--synapse-border-subtle)] rounded-full">
                <Activity size={10} className={stat.color} />
                <span className={cn("text-[10px] font-mono font-bold uppercase tracking-wider", stat.color)}>
                {stat.trend}
                </span>
                </div>
                </div>

                {/* Value */}
                <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 + 0.2 }}
                className="text-3xl font-bold text-[var(--synapse-text-primary)] font-mono mb-1 tracking-tight"
                >
                {stat.value}
                </motion.div>

                {/* Label */}
                <div className="text-xs text-[var(--synapse-text-tertiary)] uppercase tracking-wider font-mono mb-2">
                {stat.label}
                </div>

                {/* Subtitle */}
                <div className="text-[10px] text-[var(--synapse-text-dim)] uppercase tracking-wider font-mono flex items-center gap-1">
                <Clock size={8} />
                {stat.subtitle}
                </div>

                {/* Progress bar */}
                <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: index * 0.1 + 0.4, duration: 0.5 }}
                className="mt-3 h-1 bg-[var(--synapse-panel-bg)] rounded-full overflow-hidden"
                style={{ originX: 0 }}
                >
                <motion.div
                animate={{
                    x: ['-100%', '100%'],
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: index * 0.2,
                }}
                className={cn("h-full w-1/3 rounded-full", stat.bgColor, stat.color)}
                />
                </motion.div>
                </CardContent>
                </Card>
                </motion.div>
            );
        })}
        </div>
    );
};
