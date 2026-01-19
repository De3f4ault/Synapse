import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Target, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DueItems } from "./components/queue/DueItems";
import { Recommendations } from "./components/recommendations/Recommendations";
import { StudyStats } from "./components/shared/StudyStats";
import { StreakIndicator } from "./components/shared/StreakIndicator";
import { useDueItemsStats } from "./hooks/useDueItems";
import { useRecommendations } from "./hooks/useRecommendations";
import { useTodayStats } from "./hooks/useTodayStats";
import { UsersService } from "@/api/generated";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { StudyStreak } from "./types/study.types";

export function StudyPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"due" | "recommendations">("due");

  // Data Hooks
  const dueStats = useDueItemsStats();
  const { data: recommendations } = useRecommendations(10);
  const { data: todayStats } = useTodayStats();

  const { data: userStats } = useQuery({
    queryKey: ["user-statistics"],
    queryFn: () => UsersService.getStatisticsApiV1UsersMeStatisticsGet(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Transform user statistics to streak format
  const streak: StudyStreak = {
    current: userStats?.study_streak_days || 0,
    longest: userStats?.study_streak_days || 0,
    lastStudyDate: new Date().toISOString(),
    daysStudied: Math.floor((userStats?.total_study_time_minutes || 0) / 60),
    weeklyGoal: 5,
    weeklyProgress: Math.min(userStats?.study_streak_days || 0, 7),
  };

  // Navigate to immersive study session
  const handleStartDueSession = () => {
    navigate("/study/session?type=due");
  };

  const handleStartRecommendedSession = () => {
    navigate("/study/session?type=recommended");
  };

  // Dashboard View (session now navigates to /study/session)
  return (
    <div className="h-[calc(100vh-64px)] overflow-hidden flex flex-col p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            Study Hub
          </h1>
          <p className="text-slate-400 font-mono text-xs tracking-wider uppercase">
            Master your knowledge
          </p>
        </div>

        {/* Streak - Small Layout */}
        <div className="flex items-center gap-4 bg-white/5 border border-white/5 px-4 py-2 rounded-xl">
          <div className="text-right">
            <div className="text-xs text-slate-500 uppercase tracking-wider">
              Streak
            </div>
            <div className="text-xl font-bold text-cyan-400 font-mono">
              {streak.current}{" "}
              <span className="text-sm text-slate-500">days</span>
            </div>
          </div>
          <div className="h-8 w-8 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
            <Sparkles size={16} className="text-cyan-400" />
          </div>
        </div>
      </div>

      {/* Main Content Content */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-8">
        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <StudyStats
            dueCount={dueStats.total}
            recommendedCount={recommendations?.length || 0}
            avgAccuracy={Math.round((userStats?.overall_accuracy || 0) * 100)}
            totalTimeToday={todayStats?.study_time_minutes || 0}
          />
          <div className="md:col-span-1">
            <StreakIndicator streak={streak} />
          </div>
        </motion.div>

        {/* Tabs & Lists */}
        <div className="space-y-6">
          {/* Custom Tabs */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setActiveTab("due")}
              className={cn(
                "px-6 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2",
                activeTab === "due"
                  ? "border-cyan-500 text-cyan-400 bg-cyan-500/5"
                  : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5",
              )}
            >
              <Target size={16} />
              Due Items
              {dueStats.total > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px]">
                  {dueStats.total}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("recommendations")}
              className={cn(
                "px-6 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2",
                activeTab === "recommendations"
                  ? "border-purple-500 text-purple-400 bg-purple-500/5"
                  : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5",
              )}
            >
              <Sparkles size={16} />
              AI Insights
            </button>
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            <AnimatePresence mode="wait">
              {activeTab === "due" && (
                <motion.div
                  key="due"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <DueItems
                    modules="flashcards,quizzes"
                    limit={20}
                    onStartSession={handleStartDueSession}
                  />
                </motion.div>
              )}
              {activeTab === "recommendations" && (
                <motion.div
                  key="recommendations"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Recommendations
                    limit={10}
                    onStartSession={handleStartRecommendedSession}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
