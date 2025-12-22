import React from "react";
import { cn } from "@/lib/utils";

interface QuizProgressProps {
  totalQuestions: number;
  currentIndex: number;
}

/**
 * Visual progress indicator for quiz
 */
export const QuizProgress: React.FC<QuizProgressProps> = ({
  totalQuestions,
  currentIndex,
}) => {
  return (
    <div className="flex flex-col items-center">
      <div className="text-[10px] font-mono text-cyan-500 mb-1 tracking-[0.2em]">
        SIMULATION PROGRESS
      </div>
      <div className="flex gap-1">
        {Array.from({ length: totalQuestions }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-8 h-1 rounded-full transition-all duration-300",
              i < currentIndex
                ? "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                : i === currentIndex
                  ? "bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                  : "bg-white/10",
            )}
          />
        ))}
      </div>
    </div>
  );
};
