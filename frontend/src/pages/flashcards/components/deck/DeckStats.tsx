/**
 * DeckStats Component
 * Display deck statistics in a modern dashboard grid
 */

import { motion } from 'framer-motion';
import { Target, Layers, Clock, Brain, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DeckStats as DeckStatsType } from '../../types/flashcards.types';

interface DeckStatsProps {
    stats: DeckStatsType;
}

export function DeckStats({ stats }: DeckStatsProps) {
    const statItems = [
        {
            label: 'Total Fragments',
            value: stats.totalCards,
            icon: Layers,
            color: 'cyan',
        },
        {
            label: 'Due Now',
            value: stats.dueCards,
            icon: Clock,
            color: 'amber',
        },
        {
            label: 'In Progress',
            value: stats.learningCards,
            icon: Brain,
            color: 'purple',
        },
        {
            label: 'Mastered',
            value: stats.masteredCards,
            icon: Sparkles,
            color: 'emerald',
        },
    ];

    const colorClasses = {
        cyan: 'text-cyan-500 from-cyan-500/10',
        amber: 'text-amber-500 from-amber-500/10',
        purple: 'text-purple-500 from-purple-500/10',
        emerald: 'text-emerald-500 from-emerald-500/10',
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Circular Progress */}
        <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        >
        <Card className="bg-[rgba(10,10,10,0.6)] backdrop-blur-xl border-white/5">
        <CardContent className="flex flex-col items-center justify-center py-6">
        <div className="relative w-32 h-32">
        <svg className="transform -rotate-90 w-32 h-32">
        <circle
        cx="64"
        cy="64"
        r="56"
        stroke="currentColor"
        strokeWidth="8"
        fill="none"
        className="text-slate-800"
        />
        <motion.circle
        cx="64"
        cy="64"
        r="56"
        stroke="currentColor"
        strokeWidth="8"
        fill="none"
        strokeDasharray={`${2 * Math.PI * 56}`}
        initial={{ strokeDashoffset: 2 * Math.PI * 56 }}
        animate={{
            strokeDashoffset: 2 * Math.PI * 56 * (1 - stats.masteryPercent / 100),
        }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
        />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white">{stats.masteryPercent}%</span>
        <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
        Synced
        </span>
        </div>
        </div>
        <Target className="h-5 w-5 text-emerald-500 mt-2" />
        </CardContent>
        </Card>
        </motion.div>

        {/* Quick Stats */}
        {statItems.map((stat, index) => {
            const colors = colorClasses[stat.color as keyof typeof colorClasses];
            const Icon = stat.icon;

            return (
                <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                >
                <Card className="bg-[rgba(10,10,10,0.6)] backdrop-blur-xl border-white/5 relative overflow-hidden">
                <div
                className={`absolute inset-0 bg-gradient-to-br ${colors.split(' ')[1]} via-transparent to-transparent opacity-50`}
                />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                {stat.label}
                </p>
                <Icon className={cn('h-4 w-4', colors.split(' ')[0])} />
                </CardHeader>
                <CardContent className="relative z-10">
                <p className="text-3xl font-bold text-white">{stat.value}</p>
                </CardContent>
                </Card>
                </motion.div>
            );
        })}
        </div>
    );
}
