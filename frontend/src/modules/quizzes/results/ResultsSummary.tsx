/**
 * ResultsSummary - Performance Stats Display
 *
 * Shows quiz performance with grade, score, and stats.
 */

import React from "react";
import { motion } from "framer-motion";
import { Trophy, Clock, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuizPerformance } from "../core";

interface ResultsSummaryProps {
    performance: QuizPerformance;
    onReturn: () => void;
    children?: React.ReactNode;
}

/**
 * Format seconds to readable duration
 */
function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
}

export const ResultsSummary: React.FC<ResultsSummaryProps> = ({
    performance,
    onReturn,
    children,
}) => {
    const { score, percentage, rank, duration, correctCount, totalCount } =
        performance;
    const incorrectCount = totalCount - correctCount;

    return (
        <div className="h-full flex flex-col items-center justify-center p-8 overflow-y-auto">
            <div className="max-w-md w-full text-center space-y-8">
                {/* Grade Badge */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", duration: 0.5 }}
                    className={cn(
                        "w-32 h-32 mx-auto rounded-full flex items-center justify-center",
                        "border-4",
                        rank.bg,
                        rank.color === "text-accent-olive"
                            ? "border-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.2)]"
                            : rank.color === "text-primary"
                                ? "border-primary/40 shadow-[0_0_40px_rgba(6,182,212,0.2)]"
                                : rank.color === "text-yellow-400"
                                    ? "border-yellow-500/40 shadow-[0_0_40px_rgba(234,179,8,0.2)]"
                                    : "border-red-500/40 shadow-[0_0_40px_rgba(239,68,68,0.2)]"
                    )}
                >
                    <span className={cn("text-5xl font-bold", rank.color)}>
                        {rank.grade}
                    </span>
                </motion.div>

                {/* Percentage */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <h1 className="text-5xl font-bold text-foreground mb-2">
                        {Math.round(percentage)}%
                    </h1>
                    <p className="text-muted-foreground">
                        {correctCount} of {totalCount} correct
                    </p>
                </motion.div>

                {/* Stats Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-3 gap-4"
                >
                    <div className="bg-card border border-border rounded-xl p-4">
                        <Trophy size={20} className="text-warning mx-auto mb-2" />
                        <p className="text-lg font-bold text-foreground">{Math.round(score)}</p>
                        <p className="text-xs text-muted-foreground">Score</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4">
                        <Clock size={20} className="text-primary mx-auto mb-2" />
                        <p className="text-lg font-bold text-foreground">
                            {formatDuration(duration)}
                        </p>
                        <p className="text-xs text-muted-foreground">Time</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4">
                        <div className="flex justify-center gap-1 mb-2">
                            <CheckCircle size={16} className="text-accent-olive" />
                            <XCircle size={16} className="text-destructive" />
                        </div>
                        <p className="text-lg font-bold text-foreground">
                            {correctCount}/{incorrectCount}
                        </p>
                        <p className="text-xs text-muted-foreground">Right/Wrong</p>
                    </div>
                </motion.div>

                {/* Children (AI Insights, etc.) */}
                {children}

                {/* Return Button */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    <button
                        onClick={onReturn}
                        className="px-8 py-3 rounded-lg font-medium bg-white/[0.04] hover:bg-white/[0.08] text-foreground border border-border transition-colors"
                    >
                        Return to Quizzes
                    </button>
                </motion.div>
            </div>
        </div>
    );
};
