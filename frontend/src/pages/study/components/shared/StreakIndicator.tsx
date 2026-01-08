/**
 * StreakIndicator - Displays study streak progress
 *
 * Shows current streak, longest streak, and weekly goal progress
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Flame, Trophy, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { StudyStreak } from "../../types/study.types";

interface StreakIndicatorProps {
  streak: StudyStreak;
}

export function StreakIndicator({ streak }: StreakIndicatorProps) {
  const weeklyProgress = (streak.weeklyProgress / streak.weeklyGoal) * 100;
  const isStreakActive = streak.current > 0;
  const isWeeklyGoalMet = streak.weeklyProgress >= streak.weeklyGoal;
  const hasAnyHistory = streak.longest > 0 || streak.daysStudied > 0;

  // Minimal state: no streak, no history → hide entirely or show single line
  if (!isStreakActive && !hasAnyHistory) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-muted/50 text-muted-foreground">
        <Flame className="h-4 w-4" />
        <span className="text-sm">Start studying today to begin your streak!</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Flame
            className={`h-4 w-4 ${isStreakActive ? "text-orange-500" : "text-muted-foreground"}`}
          />
          Study Streak
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Streak - Only show if active */}
        {isStreakActive && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current</span>
            <motion.span
              className="text-2xl font-bold"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {streak.current}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                {streak.current === 1 ? "day" : "days"}
              </span>
            </motion.span>
          </div>
        )}

        {/* Weekly Goal Progress - Simplified */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Weekly Goal</span>
            <span className="font-medium">
              {streak.weeklyProgress}/{streak.weeklyGoal}
            </span>
          </div>
          <Progress
            value={weeklyProgress}
            className={cn("h-1.5", isWeeklyGoalMet && "bg-green-100")}
          />
        </div>

        {/* Minimal Stats - Single row */}
        <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1">
            <Trophy className="h-3 w-3" />
            <span>Best: {streak.longest}d</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Total: {streak.daysStudied}d</span>
          </div>
        </div>

        {/* Celebration message - only when streak >= 7 */}
        {streak.current >= 7 && (
          <div className="p-2 bg-orange-50 dark:bg-orange-950/50 rounded text-xs text-orange-700 dark:text-orange-300">
            {streak.current}-day streak! 🔥
          </div>
        )}
      </CardContent>
    </Card>
  );
}
