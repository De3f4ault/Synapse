import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PerformanceChartProps {
    scores: number[];
    averageScore: number;
}

/**
 * Simple performance chart (placeholder for future chart library)
 */
export const PerformanceChart: React.FC<PerformanceChartProps> = ({
    scores,
    averageScore,
}) => {
    const latestScore = scores[scores.length - 1] || 0;
    const trend = latestScore > averageScore ? 'up' : 'down';

    return (
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
        <h3 className="text-sm font-mono text-cyan-400 uppercase tracking-wider mb-4">
        Performance Trend
        </h3>

        {/* Simple bar chart visualization */}
        <div className="flex items-end gap-2 h-32 mb-4">
        {scores.slice(-10).map((score, i) => (
            <div
            key={i}
            className="flex-1 bg-cyan-500/20 rounded-t relative group"
            style={{ height: `${(score / 100) * 100}%` }}
            >
            <div className="absolute inset-0 bg-cyan-500/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-t" />
            </div>
        ))}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm">
        <div>
        <div className="text-slate-500 text-xs font-mono mb-1">Latest</div>
        <div className="text-white font-bold">{latestScore}%</div>
        </div>
        <div className="flex items-center gap-2">
        {trend === 'up' ? (
            <TrendingUp className="w-5 h-5 text-emerald-400" />
        ) : (
            <TrendingDown className="w-5 h-5 text-red-400" />
        )}
        <span className={trend === 'up' ? 'text-emerald-400' : 'text-red-400'}>
        {Math.abs(latestScore - averageScore).toFixed(0)}%
        </span>
        </div>
        <div>
        <div className="text-slate-500 text-xs font-mono mb-1">Average</div>
        <div className="text-white font-bold">{averageScore.toFixed(0)}%</div>
        </div>
        </div>
        </div>
    );
};
