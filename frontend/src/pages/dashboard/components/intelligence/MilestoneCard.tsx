import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Share2, Sparkles, Star } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { MilestoneAchievement } from '../../types/intelligence.types';

/**
 * MilestoneCard - "Achievement" Style
 */
export function MilestoneCard({ milestone, onShare }: { milestone: MilestoneAchievement; onShare?: () => void }) {
    return (
        <motion.div whileHover={{ scale: 1.02, rotate: 1 }}>
        <Card className="bg-gradient-to-br from-[#1a1528] to-[#0F0F0F] border border-purple-500/30 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-3 opacity-20">
        <Sparkles className="w-12 h-12 text-purple-500" />
        </div>

        <CardContent className="p-3 flex items-center gap-3 relative z-10">
        <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
        <Trophy className="w-5 h-5 text-purple-400" />
        </div>

        <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-0.5">
        <h4 className="text-xs font-bold text-white">{milestone.title}</h4>
        <span className="text-[9px] text-purple-400 font-mono border border-purple-500/30 px-1 rounded">
        {milestone.level}
        </span>
        </div>
        <p className="text-[10px] text-slate-400 leading-tight line-clamp-2">{milestone.description}</p>
        </div>
        </CardContent>
        </Card>
        </motion.div>
    );
}
