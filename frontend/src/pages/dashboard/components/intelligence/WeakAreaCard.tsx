import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, TrendingDown, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WeakAreaInsight } from '../../types/intelligence.types';

interface WeakAreaCardProps {
    weakArea: WeakAreaInsight;
    onPractice?: () => void;
}

/**
 * WeakAreaCard - "Critical Alert" Style
 */
export function WeakAreaCard({ weakArea, onPractice }: WeakAreaCardProps) {
    const isCritical = weakArea.severity === 'critical';

    return (
        <motion.div whileHover={{ scale: 1.02 }}>
        <Card className={cn(
            "bg-[#0F0F0F] border overflow-hidden relative group",
            isCritical ? "border-red-500/30" : "border-orange-500/30"
        )}>
        {isCritical && <div className="absolute inset-0 bg-red-500/5 animate-pulse-slow pointer-events-none" />}

        <CardContent className="p-3 space-y-3 relative z-10">
        <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
        <AlertCircle className={cn("w-4 h-4", isCritical ? "text-red-500" : "text-orange-500")} />
        <h4 className="text-xs font-bold text-white truncate max-w-[150px]">{weakArea.topic}</h4>
        </div>
        <Badge variant="outline" className={cn("text-[9px] uppercase h-5", isCritical ? "border-red-500 text-red-500 bg-red-500/10" : "border-orange-500 text-orange-500 bg-orange-500/10")}>
        {weakArea.severity}
        </Badge>
        </div>

        <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] text-slate-500 uppercase tracking-wider">
        <span>Accuracy</span>
        <span className={cn("font-mono font-bold", isCritical ? "text-red-400" : "text-orange-400")}>
        {(weakArea.accuracy * 100).toFixed(0)}%
        </span>
        </div>
        <Progress value={weakArea.accuracy * 100} className="h-1 bg-white/10" indicatorClassName={isCritical ? "bg-red-500" : "bg-orange-500"} />
        </div>

        <Button
        size="sm"
        variant="ghost"
        className={cn("w-full h-7 text-[10px] font-bold uppercase border bg-transparent hover:text-white",
            isCritical ? "border-red-500/30 text-red-400 hover:bg-red-500/20" : "border-orange-500/30 text-orange-400 hover:bg-orange-500/20"
        )}
        onClick={onPractice || (() => window.location.href = `/flashcards/review?topic=${encodeURIComponent(weakArea.topic)}`)}
        >
        Reinforce Node
        </Button>
        </CardContent>
        </Card>
        </motion.div>
    );
}
