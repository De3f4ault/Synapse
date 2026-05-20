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
import { GlassCard } from "@/shared/ui";

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
                    "bg-destructive/10 text-destructive border-red-500/30",
            };
        case "medium":
            return {
                text: difficulty || "Medium",
                className:
                    "bg-warning/10 text-warning border-amber-500/30",
            };
        case "easy":
        default:
            return {
                text: difficulty || "Easy",
                className:
                    "bg-accent-olive/10 text-accent-olive border-accent-olive/30",
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
                    "cursor-pointer min-h-[16rem]"
                )}
            >
                <GlassCard
                    hover
                    className="h-full flex flex-col p-6 border-transparent transition-all duration-300"
                >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/10 text-primary">
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
                        <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                            {quiz.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed group-hover:text-muted-foreground transition-colors">
                            {quiz.description ||
                                "No description available for this quiz."}
                        </p>
                    </div>

                    {/* Footer Stats */}
                    <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                                <FileQuestion size={12} className="text-muted-foreground" />
                                {quiz.question_count || 0} Qs
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Trophy size={12} className="text-muted-foreground" />
                                {quiz.time_limit_minutes
                                    ? `${quiz.time_limit_minutes}m`
                                    : "∞"}
                            </span>
                        </div>

                        <motion.div
                            className="p-2 rounded-full bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-opacity"
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
