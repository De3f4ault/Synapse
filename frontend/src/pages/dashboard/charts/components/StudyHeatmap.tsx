/**
 * StudyHeatmap - Activity calendar visualization
 * GitHub-style contribution heatmap for study activity
 */

import { useState } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import GlassCard from "@/components/ui/GlassCard";
import type { HeatmapData } from "@/api/generated";

interface StudyHeatmapProps {
    data: HeatmapData[];
    className?: string;
}

function getIntensity(count: number, maxActivity: number): string {
    if (count === 0) return "bg-white/5";
    const ratio = count / maxActivity;
    if (ratio > 0.75) return "bg-green-500";
    if (ratio > 0.5) return "bg-green-400";
    if (ratio > 0.25) return "bg-green-300";
    return "bg-green-200";
}

function generateDays(data: HeatmapData[]): HeatmapData[] {
    const days: HeatmapData[] = [];
    const today = new Date();

    for (let i = 364; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0]!;
        const activity = data.find((d) => d.date === dateStr);
        days.push(activity || { date: dateStr, activity_count: 0 });
    }

    return days;
}

export function StudyHeatmap({ data, className }: StudyHeatmapProps) {
    const [hoveredDay, setHoveredDay] = useState<HeatmapData | null>(null);

    const days = generateDays(data);
    const maxActivity = Math.max(...data.map((d) => d.activity_count), 1);
    const activeDays = data.filter((d) => d.activity_count > 0).length;

    // Group by weeks
    const weeks: HeatmapData[][] = [];
    for (let i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7));
    }

    return (
        <GlassCard className={cn("p-6", className)}>
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-purple-400" />
                        <h3 className="text-lg font-semibold text-white">
                            Activity Heatmap
                        </h3>
                    </div>
                    <div className="text-xs text-slate-500">
                        {activeDays} active days
                    </div>
                </div>

                {/* Heatmap Grid */}
                <div className="overflow-x-auto">
                    <div className="flex gap-1">
                        {weeks.map((week, weekIdx) => (
                            <div key={weekIdx} className="flex flex-col gap-1">
                                {week.map((day, dayIdx) => (
                                    <div
                                        key={dayIdx}
                                        className={cn(
                                            "w-3 h-3 rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-white/30",
                                            getIntensity(day.activity_count, maxActivity)
                                        )}
                                        onMouseEnter={() => setHoveredDay(day)}
                                        onMouseLeave={() => setHoveredDay(null)}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Less</span>
                        <div className="flex gap-1">
                            {[
                                "bg-white/5",
                                "bg-green-200",
                                "bg-green-300",
                                "bg-green-400",
                                "bg-green-500",
                            ].map((color, i) => (
                                <div key={i} className={cn("w-3 h-3 rounded-sm", color)} />
                            ))}
                        </div>
                        <span className="text-xs text-slate-500">More</span>
                    </div>

                    {hoveredDay && (
                        <div className="text-xs text-white">
                            {new Date(hoveredDay.date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                            })}
                            : {hoveredDay.activity_count} activities
                        </div>
                    )}
                </div>
            </div>
        </GlassCard>
    );
}
