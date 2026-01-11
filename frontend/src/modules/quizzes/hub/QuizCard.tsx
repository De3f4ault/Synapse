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
import GlassCard from "@/components/ui/GlassCard";

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
                    "cursor-pointer h-full"
                )}
            >
                <GlassCard
                    hover
                    className="h-full flex flex-col p-6 border-transparent transition-all duration-300"
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
                        <h3 className="text-lg font-bold text-slate-100 mb-2 group-hover:text-cyan-400 transition-colors line-clamp-2">
                            {quiz.title}
                        </h3>
                        <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed group-hover:text-slate-400 transition-colors">
                            {quiz.description ||
                                "No description available for this quiz."}
                        </p>
                    </div>

                    {/* Footer Stats */}
                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs font-mono text-slate-600">
                            <span className="flex items-center gap-1.5">
                                <FileQuestion size={12} className="text-slate-500" />
                                {quiz.question_count || 0} Qs
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Trophy size={12} className="text-slate-500" />
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
                </GlassCard>
            </div>
        </motion.div>
    );
};
