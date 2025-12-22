import React from "react";
import { FileQuestion, Trophy, Target, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { QuizStatistics } from "../../types/quizzes.types";

interface QuizStatsProps {
  statistics: QuizStatistics;
}

/**
 * Display aggregate quiz statistics
 */
export const QuizStats: React.FC<QuizStatsProps> = ({ statistics }) => {
  const statCards = [
    {
      label: "Total Quizzes",
      value: statistics.totalQuizzes,
      icon: FileQuestion,
      color: "text-cyan-400",
      bgColor: "bg-cyan-950/30",
    },
    {
      label: "Attempts",
      value: statistics.totalAttempts,
      icon: Target,
      color: "text-purple-400",
      bgColor: "bg-purple-950/30",
    },
    {
      label: "Average Score",
      value: `${statistics.averageScore.toFixed(0)}%`,
      icon: TrendingUp,
      color: "text-emerald-400",
      bgColor: "bg-emerald-950/30",
    },
    {
      label: "Best Score",
      value: `${statistics.bestScore.toFixed(0)}%`,
      icon: Trophy,
      color: "text-amber-400",
      bgColor: "bg-amber-950/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.label}
            className="bg-white/5 border-white/10 overflow-hidden"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon size={20} className={stat.color} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">
                    {stat.value}
                  </div>
                  <div className="text-xs text-slate-400">{stat.label}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
