/**
 * StudyStats - Overview of study statistics
 *
 * Displays key metrics: due items, recommendations, accuracy, and time spent
 */

import { Card, CardContent } from '@/components/ui/card';
import { Target, Sparkles, TrendingUp, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface StudyStatsProps {
    dueCount: number;
    recommendedCount: number;
    avgAccuracy: number;
    totalTimeToday: number; // minutes
}

export function StudyStats({
    dueCount,
    recommendedCount,
    avgAccuracy,
    totalTimeToday,
}: StudyStatsProps) {
    const stats = [
        {
            icon: Target,
            label: 'Items Due',
            value: dueCount,
            suffix: 'items',
            color: 'text-red-500',
            bgColor: 'bg-red-50 dark:bg-red-950',
        },
        {
            icon: Sparkles,
            label: 'Recommended',
            value: recommendedCount,
            suffix: 'items',
            color: 'text-purple-500',
            bgColor: 'bg-purple-50 dark:bg-purple-950',
        },
        {
            icon: TrendingUp,
            label: 'Avg Accuracy',
            value: avgAccuracy,
            suffix: '%',
            color: 'text-green-500',
            bgColor: 'bg-green-50 dark:bg-green-950',
        },
        {
            icon: Clock,
            label: 'Time Today',
            value: totalTimeToday,
            suffix: 'min',
            color: 'text-blue-500',
            bgColor: 'bg-blue-50 dark:bg-blue-950',
        },
    ];

    return (
        <Card>
        <CardContent className="pt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
            <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="space-y-2"
            >
            <div className={`p-2 rounded-lg w-fit ${stat.bgColor}`}>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <div>
            <p className="text-2xl font-bold">
            {stat.value}
            <span className="text-sm font-normal text-muted-foreground ml-1">
            {stat.suffix}
            </span>
            </p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
            </motion.div>
        ))}
        </div>
        </CardContent>
        </Card>
    );
}
