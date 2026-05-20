/**
 * IntelligencePanel - Unified Search Integration Display
 * 
 * Displays intelligence insights from the Search Intelligence Bus.
 * NO actions, NO buttons - just truthful signals.
 * 
 * Shows:
 * - Concept name
 * - Mastery percentage (primary)
 * - Trend indicator (↑ ↓ →)
 * - Confidence badge (opacity)
 * - Freshness indicator
 * 
 * Graceful degradation:
 * - "Insights temporarily unavailable" when graph is down
 */

import { Brain, TrendingUp, TrendingDown, Minus, WifiOff } from "lucide-react";
import { NeumorphicCard } from "@/components/neumorphic";
import { cn } from "@/lib/utils";
import { useDashboardIntelligence } from "../hooks/useDashboardIntelligence";
import type { DiagnosticInsight } from "../hooks/useDashboardIntelligence";

interface IntelligencePanelProps {
    className?: string;
}

/**
 * Trend icon component
 */
function TrendIcon({ trend }: { trend: "up" | "down" | "neutral" }) {
    switch (trend) {
        case "up":
            return <TrendingUp className="w-3 h-3 text-accent-olive" />;
        case "down":
            return <TrendingDown className="w-3 h-3 text-destructive" />;
        default:
            return <Minus className="w-3 h-3 text-muted-foreground" />;
    }
}

/**
 * Single insight row
 */
function InsightRow({ insight }: { insight: DiagnosticInsight }) {
    const masteryPct = (insight.mastery * 100).toFixed(0);
    const confidenceOpacity = insight.confidence ?? 0.75;

    return (
        <div
            className="space-y-2"
            style={{ opacity: Math.max(0.5, confidenceOpacity) }}
        >
            <div className="flex justify-between items-start text-sm gap-2">
                <div className="flex-1 min-w-0">
                    <span className="font-medium text-foreground/80 block truncate">
                        {insight.conceptName}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                        {/* Trend indicator */}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <TrendIcon trend={insight.trend} />
                            <span className="capitalize">{insight.trend}</span>
                        </div>

                        {/* Weak area badge */}
                        {insight.isWeakArea && (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] uppercase tracking-wider font-medium text-warning bg-warning/10 border-warning/20">
                                Weak
                            </div>
                        )}

                        {/* Fragile badge */}
                        {insight.isFragile && (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] uppercase tracking-wider font-medium text-destructive bg-destructive/10 border-destructive/20">
                                Fragile
                            </div>
                        )}
                    </div>
                </div>
                <span className={cn(
                    "font-bold font-mono shrink-0",
                    insight.mastery < 0.3 ? "text-destructive" :
                        insight.mastery < 0.6 ? "text-warning" :
                            "text-accent-olive"
                )}>
                    {masteryPct}%
                </span>
            </div>

            {/* Mastery bar */}
            <div className="h-2 w-full bg-foreground/5 rounded-full overflow-hidden">
                <div
                    className={cn(
                        "h-full rounded-full transition-all duration-500",
                        insight.mastery < 0.3 ? "bg-destructive" :
                            insight.mastery < 0.6 ? "bg-amber-400" :
                                "bg-accent-olive"
                    )}
                    style={{ width: `${insight.mastery * 100}%` }}
                />
            </div>
        </div>
    );
}

/**
 * Main intelligence panel
 */
export function IntelligencePanel({ className }: IntelligencePanelProps) {
    const { insights, isLoading, isUnavailable, errorMessage, responseTimeMs } = useDashboardIntelligence();

    return (
        <NeumorphicCard className={cn("p-6 flex flex-col", className)}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-muted border border-border rounded-lg flex items-center justify-center text-primary">
                    <Brain className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-foreground">Learning Intelligence</h3>
                    <p className="text-xs text-muted-foreground">
                        {responseTimeMs ? `Updated ${responseTimeMs}ms ago` : "Graph insights"}
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 w-full overflow-y-auto scrollbar-hide space-y-5 pr-2">
                {/* Loading state */}
                {isLoading && (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8">
                        <div className="w-10 h-10 rounded-xl bg-muted border border-border rounded-lg flex items-center justify-center mb-3 animate-pulse">
                            <Brain className="w-5 h-5 text-primary/50" />
                        </div>
                        <p className="text-sm text-muted-foreground">Loading intelligence...</p>
                    </div>
                )}

                {/* Unavailable state - graceful degradation */}
                {!isLoading && isUnavailable && (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8">
                        <div className="w-14 h-14 rounded-2xl bg-muted border border-border rounded-lg flex items-center justify-center mb-4 text-muted-foreground">
                            <WifiOff className="w-7 h-7" />
                        </div>
                        <p className="text-sm text-muted-foreground font-medium mb-1">
                            Insights temporarily unavailable
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {errorMessage || "Graph intelligence engine is offline"}
                        </p>
                    </div>
                )}

                {/* Empty state */}
                {!isLoading && !isUnavailable && insights.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8">
                        <div className="w-14 h-14 rounded-2xl bg-muted border border-border rounded-lg flex items-center justify-center mb-4 text-accent-olive/60">
                            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <p className="text-sm text-accent-olive font-medium mb-1">
                            No diagnostic insights yet
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Complete study sessions to build learning intelligence
                        </p>
                    </div>
                )}

                {/* Insights list */}
                {!isLoading && !isUnavailable && insights.length > 0 && (
                    insights.slice(0, 6).map((insight) => (
                        <InsightRow key={insight.id} insight={insight} />
                    ))
                )}
            </div>
        </NeumorphicCard>
    );
}
