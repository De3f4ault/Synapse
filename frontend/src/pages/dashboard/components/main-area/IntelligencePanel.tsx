import { ScrollArea } from '@/components/ui/scroll-area';
import { Lightbulb, TrendingDown, Sparkles, Trophy } from 'lucide-react';
import type { DashboardData } from '../../types/dashboard.types';
import { useIntelligence } from '../../hooks/useIntelligence';
import { ContextCard } from '../intelligence/ContextCard';
import { WeakAreaCard } from '../intelligence/WeakAreaCard';
import { NextActionCard } from '../intelligence/NextActionCard';
import { MilestoneCard } from '../intelligence/MilestoneCard';
import { ActivityFeed } from '../activity/ActivityFeed';
import { ActivitySparkline } from '../activity/ActivitySparkline';

interface IntelligencePanelProps {
    data: DashboardData | undefined;
}

/**
 * IntelligencePanel - "Cortex Feed" (Left Sidebar)
 */
export function IntelligencePanel({ data }: IntelligencePanelProps) {
    const intelligence = useIntelligence(data);

    if (intelligence.isLoading) {
        return (
            <div className="h-full flex items-center justify-center dashboard-glass rounded-2xl">
            <div className="text-center space-y-2">
            <Lightbulb className="h-6 w-6 mx-auto text-purple-500 animate-pulse" />
            <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">
            ANALYZING DATA STREAM...
            </p>
            </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col gap-4">
        {/* Header */}
        <div className="dashboard-glass rounded-2xl p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
        <Sparkles className="w-4 h-4" />
        </div>
        <span className="text-xs font-bold text-white tracking-widest uppercase">Cortex Feed</span>
        </div>
        <div className="flex gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
        </div>
        </div>

        <ScrollArea className="flex-1 dashboard-glass rounded-2xl overflow-hidden border border-white/5">
        <div className="p-4 space-y-6">

        {/* Performance Sparklines */}
        <div className="space-y-2">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
        Neural Metrics
        </h3>
        <ActivitySparkline />
        </div>

        {/* Next Action (Priority) */}
        {intelligence.nextAction && (
            <div>
            <NextActionCard recommendation={intelligence.nextAction} />
            </div>
        )}

        {/* Milestones */}
        {intelligence.milestones.length > 0 && (
            <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
            <Trophy className="w-3 h-3" /> Breakthroughs
            </h3>
            {intelligence.milestones.map((milestone) => (
                <MilestoneCard
                key={milestone.id}
                milestone={milestone}
                />
            ))}
            </div>
        )}

        {/* Weak Areas */}
        {intelligence.weakAreas.length > 0 && (
            <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
            <TrendingDown className="w-3 h-3 text-red-400" /> Retention Alerts
            </h3>
            {intelligence.weakAreas.map((area) => (
                <WeakAreaCard key={area.topic} weakArea={area} />
            ))}
            </div>
        )}

        {/* Context Insights */}
        {intelligence.contextInsights.length > 0 && (
            <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
            Optimization
            </h3>
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

        {/* Bottom: Activity */}
        <div className="h-1/3 flex flex-col gap-4 shrink-0">
        <div className="flex-1 dashboard-glass rounded-2xl overflow-hidden">
        <ActivityFeed />
        </div>
        </div>
        </div>
    );
}
