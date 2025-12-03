/**
 * ReviewProgress Component
 * Progress bar and session information
 */

import { motion } from 'framer-motion';

interface ReviewProgressProps {
    current: number;
    total: number;
    title?: string;
}

export function ReviewProgress({ current, total, title }: ReviewProgressProps) {
    const progressPercent = total > 0 ? ((current + 1) / total) * 100 : 0;
    const remaining = total - current;

    return (
        <div className="flex flex-col items-center">
        {title && (
            <span className="text-xs font-mono text-cyan-500 tracking-[0.2em] uppercase mb-2">
            {title}
            </span>
        )}
        <div className="w-64 h-1 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progressPercent}%` }}
        className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
        transition={{ duration: 0.3 }}
        />
        </div>
        <div className="flex items-center gap-4 mt-2">
        <span className="text-xs font-mono text-slate-400">
        {current + 1} / {total}
        </span>
        <span className="text-xs font-mono text-slate-500">
        {remaining} remaining
        </span>
        </div>
        </div>
    );
}
