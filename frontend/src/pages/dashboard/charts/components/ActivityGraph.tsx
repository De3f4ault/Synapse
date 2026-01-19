/**
 * ActivityGraph - Learning activity area chart
 * Uses Recharts for smooth area visualization
 */

import React from "react";
import { NeumorphicCard } from "@/components/neumorphic";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from "recharts";
import type { PerformanceTrend } from "@/api/generated";
import { Loader2, TrendingUp, Zap, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useShowGrid } from "../state";
import type { TimeBucket } from "../hooks";

interface ActivityGraphProps {
    data: PerformanceTrend[];
    isLoading?: boolean;
    isFetching?: boolean;
    bucket?: TimeBucket;
    onBucketChange?: (bucket: TimeBucket) => void;
    className?: string;
}

export const ActivityGraph: React.FC<ActivityGraphProps> = ({
    data,
    isLoading,
    isFetching,
    bucket = "day",
    onBucketChange,
    className,
}) => {
    const navigate = useNavigate();
    const showGrid = useShowGrid();
    
    const buckets: TimeBucket[] = ["day", "week", "month"];

    if (isLoading) {
        return (
            <NeumorphicCard className={`h-[380px] flex flex-col items-center justify-center ${className || ""}`}>
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mb-4" />
                <span className="text-slate-400 font-mono text-sm">
                    Loading neural activity...
                </span>
            </NeumorphicCard>
        );
    }

    // Empty state
    if (!data || data.length === 0) {
        return (
            <NeumorphicCard className={`h-[380px] p-6 flex flex-col ${className || ""}`}>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl nm-inset flex items-center justify-center text-cyan-400">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Learning Activity</h3>
                        <p className="text-xs text-slate-500">Performance over time</p>
                    </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 rounded-2xl nm-inset flex items-center justify-center mb-6 text-cyan-400/50">
                        <BookOpen className="w-10 h-10" />
                    </div>
                    <h4 className="text-lg font-semibold text-white mb-2">
                        Start Your Learning Journey
                    </h4>
                    <p className="text-sm text-slate-400 mb-6 max-w-xs">
                        Complete your first study session to see your performance trends here.
                    </p>
                    <button
                        onClick={() => navigate("/flashcards/review")}
                        className="px-6 py-3 rounded-xl nm-convex text-cyan-400 font-medium hover:text-cyan-300 transition-colors flex items-center gap-2"
                    >
                        <Zap className="w-4 h-4" />
                        Start Studying
                    </button>
                </div>
            </NeumorphicCard>
        );
    }

    return (
        <NeumorphicCard className={`h-[380px] p-6 flex flex-col ${className || ""}`}>
            {/* Header with Toggle */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl nm-inset flex items-center justify-center text-cyan-400">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            Learning Activity
                            {isFetching && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
                        </h3>
                        <p className="text-xs text-slate-500">Grouped by {bucket}</p>
                    </div>
                </div>
                
                {/* Time Bucket Toggle */}
                {onBucketChange && (
                    <div className="flex rounded-lg nm-inset p-1">
                        {buckets.map((b) => (
                            <button
                                key={b}
                                onClick={() => onBucketChange(b)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                    bucket === b
                                        ? "nm-convex text-cyan-400"
                                        : "text-slate-400 hover:text-slate-300"
                                }`}
                            >
                                {b.charAt(0).toUpperCase() + b.slice(1)}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        {showGrid && (
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="rgba(255,255,255,0.05)"
                                vertical={false}
                            />
                        )}
                        <XAxis
                            dataKey="date"
                            stroke="#64748b"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) =>
                                new Date(value).toLocaleDateString(undefined, {
                                    day: "2-digit",
                                    month: "short",
                                })
                            }
                            className="font-mono"
                        />
                        <YAxis
                            stroke="#64748b"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                            domain={[0, 1]}
                            className="font-mono"
                        />
                        <Tooltip
                            content={({ active, payload, label }) => {
                                if (!active || !payload?.length) return null;
                                
                                const accuracy = payload[0]?.value as number || 0;
                                const accuracyPercent = (accuracy * 100).toFixed(0);
                                const reviewsCount = (payload[0]?.payload as any)?.reviews_count || 0;
                                const studyTime = (payload[0]?.payload as any)?.study_time_minutes || 0;
                                
                                // Quality label based on accuracy
                                let qualityLabel = "";
                                let qualityColor = "";
                                if (accuracy >= 0.9) {
                                    qualityLabel = "Strong recall";
                                    qualityColor = "#10b981"; // emerald
                                } else if (accuracy >= 0.7) {
                                    qualityLabel = "Good practice";
                                    qualityColor = "#22d3ee"; // cyan
                                } else if (accuracy >= 0.5) {
                                    qualityLabel = "Needs work";
                                    qualityColor = "#f59e0b"; // amber
                                } else if (accuracy > 0) {
                                    qualityLabel = "Struggling";
                                    qualityColor = "#ef4444"; // red
                                } else {
                                    qualityLabel = "No data";
                                    qualityColor = "#64748b"; // slate
                                }
                                
                                const dateStr = new Date(label).toLocaleDateString(undefined, {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                });
                                
                                return (
                                    <div
                                        style={{
                                            backgroundColor: "#1e2024",
                                            border: "1px solid rgba(255,255,255,0.1)",
                                            borderRadius: "12px",
                                            boxShadow: "5px 5px 10px #151619, -5px -5px 10px #272a2f",
                                            padding: "12px",
                                        }}
                                    >
                                        <p style={{ color: "#94a3b8", fontSize: "11px", marginBottom: "8px" }}>
                                            {dateStr}
                                        </p>
                                        <p style={{ color: qualityColor, fontSize: "18px", fontWeight: "bold", marginBottom: "4px" }}>
                                            {accuracyPercent}% {qualityLabel}
                                        </p>
                                        <div style={{ color: "#64748b", fontSize: "11px" }}>
                                            {reviewsCount > 0 && <span>{reviewsCount} reviews</span>}
                                            {reviewsCount > 0 && studyTime > 0 && <span> · </span>}
                                            {studyTime > 0 && <span>{studyTime} min</span>}
                                        </div>
                                    </div>
                                );
                            }}
                            cursor={{ stroke: "rgba(255,255,255,0.1)" }}
                        />
                        <Area
                            type="monotone"
                            dataKey="accuracy"
                            stroke="#22d3ee"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorScore)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </NeumorphicCard>
    );
};
