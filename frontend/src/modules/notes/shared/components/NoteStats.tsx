/**
 * Notes Module - NoteStats Component
 * Animated statistics cards with live metrics.
 *
 * MIGRATED FROM: pages/notes/components/shared/NoteStats.tsx
 */

import { motion } from "framer-motion";
import { FileText, Tag, TrendingUp, Zap } from "lucide-react";
import type { NoteResponse } from "../../core";

// ============================================================================
// Types
// ============================================================================

interface NoteStatsProps {
    notes: NoteResponse[];
}

// ============================================================================
// Component
// ============================================================================

export const NoteStats: React.FC<NoteStatsProps> = ({ notes }) => {
    const stats = {
        total: notes.length,
        totalTags: new Set(notes.flatMap((n: any) => n.tags || [])).size,
        thisWeek: notes.filter((n) => {
            const daysSinceUpdate = Math.floor(
                (Date.now() - new Date(n.updated_at).getTime()) / (1000 * 60 * 60 * 24),
            );
            return daysSinceUpdate <= 7;
        }).length,
        totalWords: notes.reduce((sum, n) => {
            const words = n.content ? n.content.trim().split(/\s+/).length : 0;
            return sum + words;
        }, 0),
        avgWords: Math.round(
            notes.reduce((sum, n) => {
                const words = n.content ? n.content.trim().split(/\s+/).length : 0;
                return sum + words;
            }, 0) / (notes.length || 1),
        ),
    };

    const statCards = [
        {
            label: "Total Notes",
            value: stats.total,
            subtitle: `${stats.avgWords} avg words`,
            icon: FileText,
            gradient: "from-blue-500 to-cyan-500",
            iconBg: "bg-blue-500/10",
            iconColor: "text-blue-600",
            trend: "+12%",
        },
        {
            label: "This Week",
            value: stats.thisWeek,
            subtitle: "Last 7 days",
            icon: TrendingUp,
            gradient: "from-emerald-500 to-green-500",
            iconBg: "bg-emerald-500/10",
            iconColor: "text-emerald-600",
            trend: stats.thisWeek > 0 ? `+${stats.thisWeek}` : "0",
        },
        {
            label: "Tags",
            value: stats.totalTags,
            subtitle: "Categories",
            icon: Tag,
            gradient: "from-purple-500 to-pink-500",
            iconBg: "bg-purple-500/10",
            iconColor: "text-purple-600",
            trend: `${notes.filter((n: any) => n.tags && n.tags.length > 0).length} tagged`,
        },
        {
            label: "Total Words",
            value: stats.totalWords.toLocaleString(),
            subtitle: `~${Math.ceil(stats.totalWords / 200)}min read`,
            icon: Zap,
            gradient: "from-amber-500 to-orange-500",
            iconBg: "bg-amber-500/10",
            iconColor: "text-amber-600",
            trend: "All time",
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statCards.map((stat, index) => {
                const Icon = stat.icon;
                return (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05, type: "spring", stiffness: 300 }}
                        whileHover={{ y: -4, transition: { duration: 0.2 } }}
                        className="group relative"
                    >
                        {/* Gradient background (hidden by default, shows on hover) */}
                        <div
                            className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                        />

                        {/* Card */}
                        <div className="relative bg-card border border-border rounded-2xl p-5 transition-all duration-300 group-hover:border-primary/30 group-hover:shadow-lg group-hover:shadow-primary/5">
                            {/* Top Row: Icon and Trend */}
                            <div className="flex items-start justify-between mb-4">
                                <div
                                    className={`w-12 h-12 rounded-xl ${stat.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                                >
                                    <Icon className={`${stat.iconColor} w-6 h-6`} />
                                </div>
                                <span className="text-xs font-medium text-muted-foreground px-2 py-1 bg-accent rounded-full">
                                    {stat.trend}
                                </span>
                            </div>

                            {/* Value */}
                            <div className="text-3xl font-bold text-foreground mb-1 tabular-nums">
                                {stat.value}
                            </div>

                            {/* Label and Subtitle */}
                            <div className="text-sm font-medium text-foreground/80 mb-1">
                                {stat.label}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {stat.subtitle}
                            </div>

                            {/* Animated bottom border */}
                            <div
                                className={`absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl bg-gradient-to-r ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                            />
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
};
