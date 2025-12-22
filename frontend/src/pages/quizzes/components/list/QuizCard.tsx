import React from "react";
import { motion } from "framer-motion";
import { Cpu, FileQuestion, Trophy, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuizResponse } from "@/api/generated";
import { NeumorphicCard, NeumorphicBadge } from "@/components/neumorphic";

interface QuizCardProps {
  quiz: QuizResponse;
  onStart: () => void;
  variants?: any;
}

/**
 * QuizCard - Refactored to use NeumorphicCard
 */
export const QuizCard: React.FC<QuizCardProps> = ({
  quiz,
  onStart,
  variants,
}) => {
  // Determine badge variant based on difficulty
  const getBadgeVariant = (difficulty?: string) => {
    const diff = difficulty?.toLowerCase();
    if (diff === "hard" || diff === "expert") return "coral"; // closest to red/danger
    if (diff === "medium") return "amber"; // warning
    return "emerald"; // success/easy
  };

  const badgeVariant = getBadgeVariant(quiz.difficulty);

  return (
    <motion.div variants={variants} layout>
      <NeumorphicCard
        onClick={onStart}
        className="h-64 flex flex-col cursor-pointer group hover:scale-[1.02] transition-transform duration-300"
        variant="default"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="p-2.5 rounded-xl bg-black/20 border border-white/5 text-cyan-400">
            <Cpu size={20} />
          </div>
          <NeumorphicBadge variant={badgeVariant}>
            {quiz.difficulty || "Standard"}
          </NeumorphicBadge>
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-xl font-bold text-slate-200 mb-2 group-hover:text-cyan-400 transition-colors line-clamp-2">
            {quiz.title}
          </h3>
          <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">
            {quiz.description ||
              "No tactical briefing available for this simulation."}
          </p>
        </div>

        {/* Footer Stats */}
        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
            <span className="flex items-center gap-1.5">
              <FileQuestion size={12} className="text-slate-400" />
              {quiz.question_count || 0} Qs
            </span>
            <span className="flex items-center gap-1.5">
              <Trophy size={12} className="text-slate-400" />
              {quiz.time_limit_minutes ? `${quiz.time_limit_minutes}m` : "∞"}
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
      </NeumorphicCard>
    </motion.div>
  );
};
