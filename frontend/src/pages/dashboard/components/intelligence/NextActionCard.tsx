import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Zap, Clock, Target, ArrowRight, Sparkles } from 'lucide-react';
import { cn, formatStudyTime } from '@/lib/utils';
import type { NextActionRecommendation } from '../../types/intelligence.types';
import { ModuleBadge } from '../shared/ModuleBadge';

interface NextActionCardProps {
    recommendation: NextActionRecommendation;
    onAction?: () => void;
}

/**
 * NextActionCard - "Protocol" Style
 */
export function NextActionCard({ recommendation, onAction }: NextActionCardProps) {
    const priorityColor = getPriorityTheme(recommendation.priority);

    return (
        <motion.div
        whileHover={{ scale: 1.02 }}
        className={cn(
            "relative overflow-hidden rounded-xl border p-4 group cursor-pointer",
            "bg-[#0F0F0F] hover:bg-[#151515] transition-all",
            priorityColor.border
        )}
        >
        {/* Animated Background Gradient */}
        <div className={cn("absolute inset-0 opacity-10 blur-xl transition-opacity group-hover:opacity-20", priorityColor.bg)} />

        <div className="relative z-10 space-y-3">
        {/* Header */}
        <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
        <div className={cn("p-1.5 rounded-lg border", priorityColor.iconBg, priorityColor.iconBorder)}>
        <Sparkles className={cn("w-3 h-3", priorityColor.text)} />
        </div>
        <span className={cn("text-[10px] font-bold uppercase tracking-widest", priorityColor.text)}>
        Recommended Protocol
        </span>
        </div>
        <ModuleBadge moduleType={recommendation.moduleType} />
        </div>

        {/* Content */}
        <div>
        <h3 className="text-sm font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">
        {recommendation.title}
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
        {recommendation.description}
        </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 py-2 border-y border-white/5 bg-black/20 rounded-lg px-2">
        <StatItem icon={Target} label="Priority" value={`${(recommendation.priority * 100).toFixed(0)}%`} color={priorityColor.text} />
        <StatItem icon={Clock} label="Est. Time" value={formatStudyTime(recommendation.estimatedMinutes)} />
        <StatItem icon={Zap} label="Confidence" value={`${(recommendation.confidence * 100).toFixed(0)}%`} />
        </div>

        {/* Reasoning */}
        <div className="text-[10px] text-slate-500 italic bg-white/5 p-2 rounded border border-white/5">
        "{recommendation.reasoning}"
        </div>

        <Button
        size="sm"
        className={cn("w-full h-8 text-xs font-bold uppercase tracking-wide", priorityColor.button)}
        onClick={onAction || (() => window.location.href = recommendation.actionUrl)}
        >
        Initialize <ArrowRight className="ml-2 h-3 w-3" />
        </Button>
        </div>
        </motion.div>
    );
}

const StatItem = ({ icon: Icon, label, value, color }: any) => (
    <div className="flex flex-col items-center justify-center text-center">
    <div className="flex items-center gap-1 text-[9px] text-slate-500 uppercase">
    <Icon className="w-2.5 h-2.5" /> {label}
    </div>
    <div className={cn("text-xs font-mono font-bold", color || "text-slate-300")}>{value}</div>
    </div>
);

function getPriorityTheme(priority: number) {
    if (priority >= 0.8) {
        return {
            border: 'border-red-500/30',
            bg: 'bg-red-600',
            iconBg: 'bg-red-500/10',
            iconBorder: 'border-red-500/20',
            text: 'text-red-400',
            button: 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
        };
    }
    return {
        border: 'border-cyan-500/30',
        bg: 'bg-cyan-600',
        iconBg: 'bg-cyan-500/10',
        iconBorder: 'border-cyan-500/20',
        text: 'text-cyan-400',
        button: 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(8,145,178,0.4)]'
    };
}
