/**
 * WeakAreasList - Visualizes weak areas identified by insights engine
 * 
 * Displays:
 * - List of weak areas from API, graph intelligence, and GIE
 * - Source indicator (gie = intelligence engine, graph = learning patterns, hybrid = confirmed)
 * - Stability indicator for decay risk
 * - Progress bar for accuracy
 * - Empty state if no weak areas
 */

import { AlertCircle, Sparkles, CheckCircle2, Brain, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NeumorphicCard } from "@/components/neumorphic";
import type { WeakAreaInsight } from "../engine/types";
import { cn } from "@/lib/utils";

interface WeakAreasListProps {
    data: WeakAreaInsight[];
    className?: string;
}

/**
 * Get source label and styling
 */
function getSourceInfo(source?: string): { label: string; className: string; Icon: typeof Sparkles | null } {
    switch (source) {
        case "gie":
            return {
                label: "Intelligence",
                className: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
                Icon: Brain,
            };
        case "graph":
            return {
                label: "Learning patterns",
                className: "text-purple-400 bg-purple-500/10 border-purple-500/20",
                Icon: Sparkles,
            };
        case "hybrid":
            return {
                label: "Confirmed",
                className: "text-amber-400 bg-amber-500/10 border-amber-500/20",
                Icon: CheckCircle2,
            };
        default:
            return {
                label: "",
                className: "",
                Icon: null,
            };
    }
}

export function WeakAreasList({ data, className }: WeakAreasListProps) {
    const navigate = useNavigate();

    return (
        <NeumorphicCard className={cn("p-6 flex flex-col", className)}>
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl nm-inset flex items-center justify-center text-red-400">
                    <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Focus Areas</h3>
                    <p className="text-xs text-slate-500">Suggested improvements</p>
                </div>
            </div>

            <div className="flex-1 w-full overflow-y-auto scrollbar-hide space-y-5 pr-2">
                {data.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8">
                        <div className="w-14 h-14 rounded-2xl nm-inset flex items-center justify-center mb-4 text-emerald-400/60">
                            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <p className="text-sm text-emerald-400 font-medium mb-1">
                            No weak areas detected
                        </p>
                        <p className="text-xs text-slate-500">
                            Complete study sessions to track areas that need focus
                        </p>
                    </div>
                ) : (
                    data.slice(0, 5).map((area, index) => {
                        const sourceInfo = getSourceInfo(area.source);

                        return (
                            <div
                                key={`${area.topic}-${area.source}-${index}`}
                                className="space-y-2 group cursor-pointer"
                                onClick={() => navigate(`/study?focus=concept:${encodeURIComponent(area.topic)}`)}
                            >
                                <div className="flex justify-between items-start text-sm gap-2">
                                    <div className="flex-1 min-w-0">
                                        <span className="font-medium text-slate-300 group-hover:text-white transition-colors block truncate">
                                            {area.topic}
                                        </span>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            {sourceInfo.Icon && (
                                                <div className={cn(
                                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] uppercase tracking-wider font-medium",
                                                    sourceInfo.className
                                                )}>
                                                    <sourceInfo.Icon className="w-3 h-3" />
                                                    {sourceInfo.label}
                                                </div>
                                            )}
                                            {/* Stability indicator for GIE sources */}
                                            {area.stability !== undefined && area.stability < 0.5 && (
                                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] uppercase tracking-wider font-medium text-red-400 bg-red-500/10 border-red-500/20">
                                                    <TrendingDown className="w-3 h-3" />
                                                    Decaying
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-red-400 font-bold font-mono shrink-0">
                                        {(area.accuracy * 100).toFixed(0)}%
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all duration-500",
                                            area.source === "gie" ? "bg-cyan-400" :
                                                area.source === "hybrid" ? "bg-amber-400" :
                                                    area.source === "graph" ? "bg-purple-400" : "bg-red-400"
                                        )}
                                        style={{ width: `${area.accuracy * 100}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </NeumorphicCard>
    );
}
