import { motion } from 'framer-motion';
import { TrendingUp, Info } from 'lucide-react';
import { usePerformanceTrends } from '@/api/hooks/useAnalytics';
import { LoadingState } from '../shared/LoadingState';

/**
 * ActivitySparkline - "Retention Projection" Style
 * Refactored to match the AnalyticsView projection card.
 */
export function ActivitySparkline() {
    const { data: trendsData, isLoading } = usePerformanceTrends(30);

    if (isLoading) return <div className="dashboard-glass h-48 flex items-center justify-center"><LoadingState /></div>;
    if (!trendsData || trendsData.length === 0) return null;

    // Use Accuracy for the main projection visualization
    const accuracyData = trendsData.map(d => d.accuracy * 100);
    const latestAccuracy = Math.round(accuracyData[accuracyData.length - 1] || 0);

    return (
        <div className="dashboard-glass rounded-2xl p-6 relative overflow-hidden group h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start mb-6 relative z-10">
        <div>
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
        Retention Projection
        <Info className="w-3 h-3 text-slate-600" />
        </h3>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Memory Decay Algorithm</p>
        </div>
        <div className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
        {latestAccuracy}% OPTIMAL
        </div>
        </div>

        {/* Chart Area */}
        <div className="flex-1 relative w-full min-h-[100px]">
        {/* Grid Lines */}
        <div className="absolute inset-0 border-l border-b border-white/10" />

        {/* Interactive Scanner Line */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
        <div className="h-full w-px bg-emerald-500/50 absolute left-1/2 animate-scanline" />
        </div>

        <SparklineSVG data={accuracyData} color="#10b981" />

        {/* Labels */}
        <div className="absolute bottom-0 left-2 translate-y-5 text-[9px] text-slate-600 font-mono">T-30</div>
        <div className="absolute bottom-0 right-0 translate-y-5 text-[9px] text-slate-600 font-mono">NOW</div>
        </div>
        </div>
    );
}

function SparklineSVG({ data, color }: { data: number[], color: string }) {
    const height = 100;
    const width = 300; // Viewport width
    const max = 100;
    const min = 0;
    const range = max - min;

    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {/* Dashed Guide */}
        <path d={`M0,${height/2} L${width},${height/2}`} stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4,4" />

        {/* Main Line */}
        <motion.polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        {/* Gradient Area */}
        <path d={`M 0,${height} L ${points} L ${width},${height} Z`} fill={`url(#gradient-${color})`} opacity="0.1" />

        <defs>
        <linearGradient id={`gradient-${color}`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor={color} />
        <stop offset="100%" stopColor="transparent" />
        </linearGradient>
        </defs>

        {/* End Point Glow */}
        {data.length > 0 && (
            <circle
            cx={width}
            cy={height - ((data[data.length-1] - min)/range)*height}
            r="3"
            fill={color}
            className="animate-pulse"
            />
        )}
        </svg>
    )
}
