import React from "react";
import { motion } from "framer-motion";
import { Trophy, Zap, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuizPerformance } from "../../types/quizzes.types";

interface ResultsSummaryProps {
  performance: QuizPerformance;
  onReturn: () => void;
  children?: React.ReactNode;
}

/**
 * Display quiz results with rank and statistics
 */
export const ResultsSummary: React.FC<ResultsSummaryProps> = ({
  performance,
  onReturn,
  children,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center p-8 bg-[#020408] relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-900/20 via-black to-black pointer-events-none" />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-lg w-full bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 text-center relative overflow-hidden z-10 max-h-full overflow-y-auto"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent opacity-50 pointer-events-none" />

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
        >
          <Trophy
            size={64}
            className="mx-auto text-emerald-400 mb-6 drop-shadow-[0_0_30px_rgba(16,185,129,0.6)]"
          />
        </motion.div>

        <h2 className="text-3xl font-serif font-bold text-white mb-2">
          Simulation Complete
        </h2>
        <p className="text-slate-400 font-mono text-xs mb-8 tracking-[0.2em] uppercase">
          Performance Report Generated
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-black/50 border border-white/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />
            <div className="text-2xl font-bold text-white relative z-10">
              {performance.percentage.toFixed(0)}%
            </div>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-1 font-mono">
              Accuracy
            </div>
          </div>
          <div className="p-4 rounded-xl bg-black/50 border border-white/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none" />
            <div className="text-2xl font-bold text-cyan-400 relative z-10">
              {performance.score.toFixed(0)}
            </div>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-1 font-mono">
              Points
            </div>
          </div>
          <div className="p-4 rounded-xl bg-black/50 border border-white/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
            <div
              className={cn(
                "text-2xl font-bold relative z-10",
                performance.rank.color,
              )}
            >
              {performance.rank.grade}
            </div>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-1 font-mono">
              Rank
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-left">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-mono">
              Max Streak
            </div>
            <div className="text-xl font-bold text-purple-400 flex items-center gap-2">
              <Zap size={16} fill="currentColor" />
              {performance.maxStreak}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-left">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-mono">
              Duration
            </div>
            <div className="text-xl font-bold text-cyan-400 flex items-center gap-2">
              <Target size={16} />
              {formatTime(performance.duration)}
            </div>
          </div>
        </div>

        {children}

        <button
          onClick={onReturn}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all uppercase tracking-[0.15em] text-xs shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:shadow-[0_0_40px_rgba(16,185,129,0.6)] hover:scale-105 active:scale-95"
        >
          Return to Hub
        </button>
      </motion.div>
    </div>
  );
};
