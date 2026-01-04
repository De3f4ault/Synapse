/**
 * ActivityHeatmap - Consistency visualization
 * 
 * Displays activity density over time (GitHub-style).
 */

import { motion } from "framer-motion";
import { Flame, Info } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDate, cn } from "@/lib/utils";
import type { HeatmapData } from "@/api/generated";
import type { ActivityStats } from "../hooks";

interface ActivityHeatmapProps {
    data: HeatmapData[];
    stats: ActivityStats | undefined;
    isLoading?: boolean;
}

export function ActivityHeatmap({ data, stats, isLoading }: ActivityHeatmapProps) {
    // Only take last ~140 days to fit grid comfortably
    const displayData = generateFullYearData(data || []).slice(0, 140);

    if (isLoading) {
        return (
            <div className="dashboard-glass rounded-2xl p-6 h-full flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="dashboard-glass rounded-2xl p-6 h-full flex flex-col relative overflow-hidden">
            {/* Header */}
            <div className="mb-6 relative z-10 flex justify-between items-start">
                <div>
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                        Consistency Matrix
                        <Info className="w-3 h-3 text-slate-600" />
                    </h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">
                        Temporal Habit Tracking
                    </p>
                </div>
                {stats && (
                    <div className="flex gap-2">
                        <div className="px-2 py-1 rounded bg-orange-500/10 border border-orange-500/20 text-[10px] font-bold text-orange-400 flex items-center gap-1">
                            <Flame className="w-3 h-3" /> {stats.currentStreak} DAY STREAK
                        </div>
                    </div>
                )}
            </div>

            {/* Heatmap Grid */}
            <div className="flex-1 flex flex-col justify-center relative z-10">
                <div className="flex flex-wrap gap-1.5 content-start">
                    {displayData.map((day, i) => {
                        const intensity = getActivityLevel(day.activity_count);
                        return (
                            <Tooltip key={i} delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: i * 0.005 }}
                                        className={cn(
                                            "w-3 h-3 rounded-sm border border-black/20 transition-all duration-300",
                                            getLevelColor(intensity),
                                            "hover:scale-150 hover:z-20 hover:border-white"
                                        )}
                                    />
                                </TooltipTrigger>
                                <TooltipContent
                                    side="top"
                                    className="bg-black/90 border-white/10 text-xs"
                                >
                                    <p className="font-bold text-emerald-400">
                                        {day.date ? formatDate(new Date(day.date), {
                                            month: "short",
                                            day: "numeric",
                                        }) : "No date"}
                                    </p>
                                    <p className="text-slate-400">{day.activity_count} Ops</p>
                                </TooltipContent>
                            </Tooltip>

                        );
                    })}
                </div>

                {/* Legend */}
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/5">
                    <span className="text-[9px] text-slate-500 font-mono">
                        ACTIVITY_DENSITY
                    </span>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] text-slate-600">IDLE</span>
                        <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-sm bg-white/5" />
                            <div className="w-2 h-2 rounded-sm bg-emerald-900/50" />
                            <div className="w-2 h-2 rounded-sm bg-emerald-600" />
                            <div className="w-2 h-2 rounded-sm bg-emerald-400 shadow-[0_0_8px_rgba(10,185,129,0.5)]" />
                        </div>
                        <span className="text-[9px] text-slate-600">PEAK</span>
                    </div>
                </div>
            </div>

            {/* Decorative Background Elements */}
            <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-emerald-500/5 blur-[50px] rounded-full pointer-events-none" />
        </div >
    );
}

// Helpers
function getActivityLevel(count: number): number {
    if (count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 5) return 2;
    if (count <= 10) return 3;
    return 4;
}

function getLevelColor(level: number): string {
    switch (level) {
        case 0: return "bg-white/5";
        case 1: return "bg-emerald-900/40";
        case 2: return "bg-emerald-700/60";
        case 3: return "bg-emerald-500";
        case 4: return "bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]";
        default: return "bg-white/5";
    }
}

function generateFullYearData(data: HeatmapData[]) {
    const dataMap = new Map(data.map((d) => [d.date || "", d.activity_count]));
    const fullYear = [];
    const today = new Date();
    for (let i = 139; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0]!;
        fullYear.push({
            date: dateStr,
            activity_count: dataMap.get(dateStr) || 0,
        });
    }
    return fullYear;
}
