import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lightbulb, TrendingDown, Sparkles, Trophy } from 'lucide-react';
import type { DashboardData } from '../../types/dashboard.types';
import { useIntelligence } from '../../hooks/useIntelligence';
import { ContextCard } from '../intelligence/ContextCard';
import { WeakAreaCard } from '../intelligence/WeakAreaCard';
import { NextActionCard } from '../intelligence/NextActionCard';
import { MilestoneCard } from '../intelligence/MilestoneCard';
import { ActivityHeatmap } from '../activity/ActivityHeatmap';
import { ActivityFeed } from '../activity/ActivityFeed';
import { ActivitySparkline } from '../activity/ActivitySparkline';

interface IntelligencePanelProps {
    data: DashboardData | undefined;
}

/**
 * IntelligencePanel - Left panel showing AI insights and activity trends
 *
 * Displays:
 * - Next recommended action (prominent)
 * - Weak areas needing attention
 * - Context insights
 * - Milestone achievements
 * - Performance trends (sparklines)
 * - Activity Overview (heatmap + recent activity feed)
 */
export function IntelligencePanel({ data }: IntelligencePanelProps) {
    const intelligence = useIntelligence(data);

    // Loading state
    if (intelligence.isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-2">
            <Lightbulb className="h-8 w-8 mx-auto text-muted-foreground animate-pulse" />
            <p className="text-sm text-muted-foreground">
            Analyzing your learning data...
            </p>
            </div>
            </div>
        );
    }

    const hasContent =
    intelligence.nextAction ||
    intelligence.weakAreas.length > 0 ||
    intelligence.milestones.length > 0 ||
    intelligence.contextInsights.length > 0;

    // Empty state
    if (!hasContent) {
        return (
            <div className="h-full flex items-center justify-center p-6">
            <div className="text-center space-y-3 max-w-sm">
            <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            >
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50" />
            </motion.div>
            <h3 className="font-semibold">All Caught Up!</h3>
            <p className="text-sm text-muted-foreground">
            No immediate actions needed. Keep up the great work! 🎉
            </p>
            </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
        <ScrollArea className="flex-1">
        {/* ============================================
            Performance Trends (Sparklines)
    ============================================ */}
    <div className="p-4 border-b border-border">
    <h3 className="text-sm font-semibold text-foreground mb-3">
    Performance Trends
    </h3>
    <ActivitySparkline />
    </div>

    <div className="p-4 space-y-4">
    {/* Header */}
    <div className="flex items-center gap-2 mb-2">
    <Lightbulb className="h-5 w-5 text-primary" />
    <h2 className="text-lg font-semibold">Intelligence</h2>
    </div>

    {/* Next Action (Most Prominent) */}
    {intelligence.nextAction && (
        <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        >
        <NextActionCard recommendation={intelligence.nextAction} />
        </motion.div>
    )}

    {/* Milestones Section */}
    {intelligence.milestones.length > 0 && (
        <div className="space-y-3">
        <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-yellow-600" />
        <h3 className="text-sm font-semibold">Achievements</h3>
        </div>
        {intelligence.milestones.map((milestone) => (
            <MilestoneCard
            key={milestone.id}
            milestone={milestone}
            onShare={() => console.log('Share milestone:', milestone)}
            />
        ))}
        </div>
    )}

    {/* Weak Areas Section */}
    {intelligence.weakAreas.length > 0 && (
        <div className="space-y-3">
        <div className="flex items-center gap-2">
        <TrendingDown className="h-4 w-4 text-orange-600" />
        <h3 className="text-sm font-semibold">Needs Attention</h3>
        </div>
        {intelligence.weakAreas.map((area) => (
            <WeakAreaCard key={area.topic} weakArea={area} />
        ))}
        </div>
    )}

    {/* Context Insights Section */}
    {intelligence.contextInsights.length > 0 && (
        <div className="space-y-3">
        <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-blue-600" />
        <h3 className="text-sm font-semibold">Insights</h3>
        </div>
        {intelligence.contextInsights.map((insight, index) => (
            <ContextCard
            key={`${insight.type}-${index}`}
            insight={insight}
            />
        ))}
        </div>
    )}
    </div>
    </ScrollArea>

    {/* ============================================
        Activity Tracking Section
        ============================================ */}
        <div className="p-4 space-y-4 border-t border-border mt-auto">
        <h3 className="text-sm font-semibold text-foreground">
        Activity Overview
        </h3>

        {/* Activity Heatmap */}
        <ActivityHeatmap />

        {/* Recent Activity Feed */}
        <div className="mt-4">
        <h4 className="text-xs font-medium text-muted-foreground mb-2">
        Recent Activity
        </h4>
        <ActivityFeed />
        </div>
        </div>
        </div>
    );
}
