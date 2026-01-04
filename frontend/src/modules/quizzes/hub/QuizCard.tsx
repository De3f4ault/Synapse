/**
 * QuizCard - Dark Premium Card Component
 *
 * Displays a quiz in the hub grid.
 * Uses a deep dark aesthetic with subtle glows, no glassmorphism.
 */

import { motion, type Variants } from "framer-motion";
import { Cpu, FileQuestion, Trophy, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuizResponse } from "@/api/generated";

interface QuizCardProps {
    quiz: QuizResponse;
    onStart: () => void;
    variants?: Variants;
}

/**
 * Get badge styling based on difficulty.
 */
function getDifficultyBadge(difficulty?: string): {
    text: string;
    className: string;
} {
    const diff = difficulty?.toLowerCase();
    switch (diff) {
        case "hard":
        case "expert":
            return {
                text: difficulty || "Hard",
                className:
                    "bg-red-500/10 text-red-400 border-red-500/30",
            };
        case "medium":
            return {
                text: difficulty || "Medium",
                className:
                    "bg-amber-500/10 text-amber-400 border-amber-500/30",
            };
        case "easy":
        default:
            return {
                text: difficulty || "Easy",
                className:
                    "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
            };
    }
}

export const QuizCard = ({
    quiz,
    onStart,
    variants,
}: QuizCardProps) => {
    const badge = getDifficultyBadge(quiz.difficulty);

    return (
        <motion.div variants={variants} layout>
            <div
                onClick={onStart}
                className={cn(
                    // Base card
                    "h-64 flex flex-col cursor-pointer group",
                    "rounded-2xl p-6",
                    // Dark solid background
                    "bg-[#0c0c12] border border-white/[0.06]",
                    // Hover effects
                    "hover:border-cyan-500/30 hover:bg-[#0e0e16]",
                    "transition-all duration-300",
                    // Subtle shadow on hover
                    "hover:shadow-[0_0_30px_rgba(6,182,212,0.08)]"
                )}
            >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2.5 rounded-xl bg-cyan-500/5 border border-cyan-500/10 text-cyan-400">
                        <Cpu size={20} />
                    </div>
                    <span
                        className={cn(
                            "px-3 py-1 rounded-full text-xs font-medium border capitalize",
                            badge.className
                        )}
                    >
                        {badge.text}
                    </span>
                </div>

                {/* Content */}
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-100 mb-2 group-hover:text-cyan-400 transition-colors line-clamp-2">
                        {quiz.title}
                    </h3>
                    <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">
                        {quiz.description ||
                            "No description available for this quiz."}
                    </p>
                </div>

                {/* Footer Stats */}
                <div className="mt-4 pt-4 border-t border-white/[0.04] flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
                        <span className="flex items-center gap-1.5">
                            <FileQuestion size={12} className="text-slate-400" />
                            {quiz.question_count || 0} Qs
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Trophy size={12} className="text-slate-400" />
                            {quiz.time_limit_minutes
                                ? `${quiz.time_limit_minutes}m`
                                : "∞"}
                        </span>
                    </div>

                    <motion.div
                        className="p-2 rounded-full bg-cyan-500/10 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <Play size={16} fill="currentColor" />
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
};
