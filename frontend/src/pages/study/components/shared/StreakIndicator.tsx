/**
 * StreakIndicator - Displays study streak progress
 *
 * Shows current streak, longest streak, and weekly goal progress
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Flame, Trophy, Target, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import type { StudyStreak } from "../../types/study.types";

interface StreakIndicatorProps {
  streak: StudyStreak;
}

export function StreakIndicator({ streak }: StreakIndicatorProps) {
  const weeklyProgress = (streak.weeklyProgress / streak.weeklyGoal) * 100;
  const isStreakActive = streak.current > 0;
  const isWeeklyGoalMet = streak.weeklyProgress >= streak.weeklyGoal;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame
            className={`h-5 w-5 ${isStreakActive ? "text-orange-500" : "text-muted-foreground"}`}
          />
          Study Streak
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Streak */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Current Streak
            </span>
            <motion.span
              className="text-3xl font-bold"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {streak.current}
              <span className="text-base font-normal text-muted-foreground ml-1">
                {streak.current === 1 ? "day" : "days"}
              </span>
            </motion.span>
          </div>

          {streak.current > 0 && (
            <p className="text-xs text-muted-foreground">
              Last studied: {formatRelativeDate(streak.lastStudyDate)}
            </p>
          )}
        </div>

        {/* Weekly Goal Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Weekly Goal</span>
            </div>
            <span className="font-medium">
              {streak.weeklyProgress} / {streak.weeklyGoal} days
            </span>
          </div>
          <Progress
            value={weeklyProgress}
            className={isWeeklyGoalMet ? "bg-green-100" : undefined}
          />
          {isWeeklyGoalMet && (
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">
              Weekly goal achieved!
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Trophy className="h-3.5 w-3.5" />
              <span className="text-xs">Longest Streak</span>
            </div>
            <p className="text-2xl font-semibold">
              {streak.longest}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                {streak.longest === 1 ? "day" : "days"}
              </span>
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span className="text-xs">Total Days</span>
            </div>
            <p className="text-2xl font-semibold">
              {streak.daysStudied}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                {streak.daysStudied === 1 ? "day" : "days"}
              </span>
            </p>
          </div>
        </div>

        {/* Motivation Message */}
        {streak.current === 0 && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Start studying today to begin your streak!
            </p>
          </div>
        )}

        {streak.current >= 7 && (
          <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
            <p className="text-sm text-orange-700 dark:text-orange-300">
              Amazing! You're on a {streak.current}-day streak! Keep it up!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Format date as relative time (e.g., "today", "yesterday", "2 days ago")
 */
function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}
