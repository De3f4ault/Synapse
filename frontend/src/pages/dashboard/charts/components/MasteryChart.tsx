/**
 * MasteryChart - Topic mastery radar chart
 * 
 * Visualizes knowledge distribution across topics.
 * Uses Recharts RadarChart.
 */

import { Award } from "lucide-react";
import {
    ResponsiveContainer,
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    Tooltip,
} from "recharts";
import { NeumorphicCard } from "@/components/neumorphic";
import type { TopicMastery } from "@/api/generated";
import { cn } from "@/lib/utils";

interface MasteryChartProps {
    data: TopicMastery[];
    className?: string;
}

export function MasteryChart({ data, className }: MasteryChartProps) {
    // Transform data for radar chart
    const chartData = data.slice(0, 6).map((item) => ({
        topic: item.topic,
        mastery: item.mastery_score * 100,
        fullMark: 100,
    }));

    return (
        <NeumorphicCard className={cn("p-6 flex flex-col", className)}>
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl nm-inset flex items-center justify-center text-yellow-500">
                    <Award className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Topic Mastery</h3>
                    <p className="text-xs text-slate-500">Knowledge distribution</p>
                </div>
            </div>

            <div className="flex-1 w-full min-h-0 flex items-center justify-center">
                {chartData.length < 3 ? (
                    <div className="text-center p-4 flex flex-col items-center">
                        <div className="w-16 h-16 rounded-2xl nm-inset flex items-center justify-center mb-4 text-amber-400/50">
                            <Award className="w-8 h-8" />
                        </div>
                        <p className="text-sm text-slate-300 mb-1">
                            {chartData.length === 0 
                                ? "Review cards to unlock mastery radar"
                                : `Need ${3 - chartData.length} more topic${3 - chartData.length > 1 ? 's' : ''} for radar`}
                        </p>
                        <p className="text-xs text-slate-500">
                            Review flashcards across at least 3 different decks
                        </p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={250}>
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                            <PolarGrid stroke="rgba(255,255,255,0.1)" />
                            <PolarAngleAxis
                                dataKey="topic"
                                tick={{ fill: "#94a3b8", fontSize: 10 }}
                            />
                            <Radar
                                name="Mastery"
                                dataKey="mastery"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                fill="#f59e0b"
                                fillOpacity={0.4}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#1e2024",
                                    borderColor: "rgba(255,255,255,0.1)",
                                    borderRadius: "12px",
                                    padding: "8px 12px",
                                    color: "#f8fafc",
                                }}
                                itemStyle={{ color: "#f59e0b" }}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </NeumorphicCard>
    );
}
