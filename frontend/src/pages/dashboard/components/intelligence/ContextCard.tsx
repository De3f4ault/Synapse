import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb, AlertTriangle, TrendingUp, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IntelligenceInsight } from '../../types/intelligence.types';

/**
 * ContextCard - "System Notification" Style
 */
export function ContextCard({ insight }: { insight: IntelligenceInsight; onActionClick?: () => void }) {
    return (
        <motion.div whileHover={{ x: 5 }}>
        <div className="p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/20 transition-all flex items-start gap-3">
        <div className="mt-0.5">
        {insight.type === 'urgency' ? <AlertTriangle className="w-3 h-3 text-amber-400" /> :
            insight.type === 'pattern' ? <TrendingUp className="w-3 h-3 text-blue-400" /> :
            <Info className="w-3 h-3 text-slate-400" />}
            </div>
            <div>
            <h4 className="text-xs font-bold text-slate-300 mb-0.5">{insight.title}</h4>
            <p className="text-[10px] text-slate-500 leading-relaxed">{insight.message}</p>
            </div>
            </div>
            </motion.div>
    );
}
