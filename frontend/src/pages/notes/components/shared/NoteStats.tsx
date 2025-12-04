import React from 'react';
import { FileText, Tag, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { NoteResponse } from '@/api/generated/types.gen';

interface NoteStatsProps {
    notes: NoteResponse[];
}

/**
 * Display aggregate statistics about notes
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
    };

    const statCards = [
        {
            label: 'Total Notes',
            value: stats.total,
            icon: FileText,
            color: 'text-cyan-400',
            bgColor: 'bg-cyan-950/30',
        },
        {
            label: 'Tagged Notes',
            value: stats.withTags,
            icon: Tag,
            color: 'text-emerald-400',
            bgColor: 'bg-emerald-950/30',
        },
        {
            label: 'Unique Tags',
            value: stats.totalTags,
            icon: Tag,
            color: 'text-purple-400',
            bgColor: 'bg-purple-950/30',
        },
        {
            label: 'Updated (7d)',
            value: stats.recentlyUpdated,
            icon: TrendingUp,
            color: 'text-amber-400',
            bgColor: 'bg-amber-950/30',
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
                <Card
                key={stat.label}
                className="bg-white/5 border-white/10 overflow-hidden"
                >
                <CardContent className="p-4">
                <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon size={20} className={stat.color} />
                </div>
                <div>
                <div className="text-2xl font-bold text-white">
                {stat.value}
                </div>
                <div className="text-xs text-slate-400">{stat.label}</div>
                </div>
                </div>
                </CardContent>
                </Card>
            );
        })}
        </div>
    );
};
