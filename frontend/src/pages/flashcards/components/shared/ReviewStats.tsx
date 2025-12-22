/**
 * ReviewStats Component
 * Display review session statistics in a modern dashboard style
 */

import { motion } from "framer-motion";
import { Target, Smile, Frown, Timer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { SessionStats } from "../../types/flashcards.types";
import { formatTime } from "../../hooks/useReviewSession";

interface ReviewStatsProps {
  stats: SessionStats;
}

export function ReviewStats({ stats }: ReviewStatsProps) {
  const statItems = [
    {
      label: "Reviewed",
      value: stats.totalReviewed,
      icon: Target,
      color: "blue",
    },
    {
      label: "Correct",
      value: stats.correct,
      icon: Smile,
      color: "emerald",
    },
    {
      label: "Incorrect",
      value: stats.incorrect,
      icon: Frown,
      color: "red",
    },
    {
      label: "Duration",
      value: formatTime(stats.duration),
      icon: Timer,
      color: "purple",
    },
  ];

  const colorClasses = {
    blue: "bg-blue-500/10 border-blue-500/30 text-blue-400",
    emerald: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    red: "bg-red-500/10 border-red-500/30 text-red-400",
    purple: "bg-purple-500/10 border-purple-500/30 text-purple-400",
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {statItems.map((stat, index) => {
        const colors = colorClasses[stat.color as keyof typeof colorClasses];
        const Icon = stat.icon;

        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`p-4 border ${colors}`}>
              <CardContent className="p-0">
                <div className="flex items-center justify-between mb-2">
                  <Icon className="h-6 w-6" />
                  <span className="text-2xl font-bold text-white">
                    {stat.value}
                  </span>
                </div>
                <p className="text-xs font-mono uppercase text-slate-400">
                  {stat.label}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
