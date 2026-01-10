/**
 * ActivitySparkline - Micro-chart for activity trends
 * 
 * Used within list items or summary cards to show quick trends.
 * Uses Recharts AreaChart.
 */

import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { cn } from "@/lib/utils";

interface ActivitySparklineProps {
    data: Array<{ value: number }>;
    color?: string;
    className?: string;
    height?: number;
}

export function ActivitySparkline({
    data,
    color = "#22d3ee",
    className,
    height = 40
}: ActivitySparklineProps) {
    if (!data || data.length === 0) return null;

    return (
        <div className={cn("w-full opacity-50 hover:opacity-100 transition-opacity", className)} style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                            <stop offset="100%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={2}
                        fill={`url(#gradient-${color})`}
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
