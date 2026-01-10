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

interface ActivityGraphProps {
    data: PerformanceTrend[];
    isLoading?: boolean;
    className?: string;
}

export const ActivityGraph: React.FC<ActivityGraphProps> = ({
    data,
    isLoading,
    className,
}) => {
    const navigate = useNavigate();
    const showGrid = useShowGrid();

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
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl nm-inset flex items-center justify-center text-cyan-400">
                    <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Learning Activity</h3>
                    <p className="text-xs text-slate-500">Performance over time</p>
                </div>
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
                            tickFormatter={(value) => `${value}%`}
                            className="font-mono"
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#1e2024",
                                borderColor: "rgba(255,255,255,0.1)",
                                borderRadius: "12px",
                                boxShadow: "5px 5px 10px #151619, -5px -5px 10px #272a2f",
                                color: "#f8fafc",
                            }}
                            itemStyle={{ color: "#22d3ee" }}
                            cursor={{ stroke: "rgba(255,255,255,0.1)" }}
                        />
                        <Area
                            type="monotone"
                            dataKey="score"
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
