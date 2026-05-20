/**
 * PerformanceChart - Accuracy trend over time
 * Line chart showing performance trends
 * 
 * Uses Recharts for visualization.
 * Gets data from props (passed by parent from React Query).
 */

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { GlassCard } from "@/shared/ui";
import type { PerformanceTrend } from "@/api/generated";
import { useShowGrid, useShowLegend } from "../state";

interface PerformanceChartProps {
    data: PerformanceTrend[];
    className?: string;
}

export function PerformanceChart({ data, className }: PerformanceChartProps) {
    const showLegend = useShowLegend();
    const showGrid = useShowGrid();

    if (!data || data.length === 0) {
        return (
            <GlassCard className={`p-6 ${className || ""}`}>
                <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">
                        Performance Trend
                    </h3>
                </div>
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                    No performance data available yet
                </div>
            </GlassCard>
        );
    }

    // Format data for chart
    const chartData = data.map((trend) => ({
        date: new Date(trend.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        }),
        accuracy: trend.accuracy * 100,
        reviews: trend.reviews_count,
    }));

    // Calculate stats
    const avgAccuracy = (data.reduce((sum, d) => sum + d.accuracy, 0) / data.length) * 100;
    const totalReviews = data.reduce((sum, d) => sum + d.reviews_count, 0);
    const totalStudyTime = Math.round(data.reduce((sum, d) => sum + d.study_time_minutes, 0) / 60);

    return (
        <GlassCard className={`p-6 ${className || ""}`}>
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold text-foreground">
                            Performance Trend
                        </h3>
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">
                        Last {data.length} days
                    </div>
                </div>

                {/* Chart */}
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData}>
                        {showGrid && (
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                        )}
                        <XAxis
                            dataKey="date"
                            stroke="#64748b"
                            style={{ fontSize: "12px" }}
                        />
                        <YAxis
                            stroke="#64748b"
                            style={{ fontSize: "12px" }}
                            domain={[0, 100]}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid #ffffff20",
                                borderRadius: "8px",
                                fontSize: "12px",
                            }}
                            labelStyle={{ color: "#cbd5e1" }}
                        />
                        {showLegend && (
                            <Legend wrapperStyle={{ fontSize: "12px" }} iconType="line" />
                        )}
                        <Line
                            type="monotone"
                            dataKey="accuracy"
                            stroke="#06b6d4"
                            strokeWidth={2}
                            dot={{ r: 4, fill: "#06b6d4" }}
                            activeDot={{ r: 6 }}
                            name="Accuracy %"
                        />
                        <Line
                            type="monotone"
                            dataKey="reviews"
                            stroke="#a855f7"
                            strokeWidth={2}
                            dot={{ r: 4, fill: "#a855f7" }}
                            activeDot={{ r: 6 }}
                            name="Reviews"
                        />
                    </LineChart>
                </ResponsiveContainer>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">
                            Avg Accuracy
                        </p>
                        <p className="text-lg font-bold text-foreground">
                            {avgAccuracy.toFixed(1)}%
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">
                            Total Reviews
                        </p>
                        <p className="text-lg font-bold text-foreground">{totalReviews}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">
                            Study Time
                        </p>
                        <p className="text-lg font-bold text-foreground">{totalStudyTime}h</p>
                    </div>
                </div>
            </div>
        </GlassCard>
    );
}
