/**
 * WelcomeCard - Personalized greeting and streak display
 * Shows user's current streak and motivational message
 */

import { motion } from 'framer-motion';
import { Flame, Calendar, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardOverview } from '@/api/generated/types.gen';

interface WelcomeCardProps {
  overview: DashboardOverview | null;
  userName?: string;
}

export function WelcomeCard({ overview, userName = 'there' }: WelcomeCardProps) {
  const streak = overview?.study_streak_days || 0;
  const reviewsToday = overview?.cards_reviewed_today || 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getMotivation = () => {
    if (streak >= 30) return 'Incredible consistency!';
    if (streak >= 7) return 'Keep the momentum going!';
    if (reviewsToday > 0) return 'Great progress today!';
    return "Let's make today count!";
  };

  return (
    <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 via-cyan-500/5 to-transparent border border-white/10 p-6"
    >
    {/* Background decoration */}
    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl" />

    <div className="relative z-10 space-y-4">
    {/* Greeting */}
    <div>
    <h2 className="text-2xl font-bold text-white mb-1">
    {getGreeting()}, {userName}
    </h2>
    <p className="text-sm text-slate-400">{getMotivation()}</p>
    </div>

    {/* Stats Grid */}
    <div className="grid grid-cols-3 gap-3">
    {/* Streak */}
    <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/5">
    <div className={cn(
      "w-8 h-8 rounded-full flex items-center justify-center",
      streak > 0 ? "bg-orange-500/20 border border-orange-500/30" : "bg-slate-500/20 border border-slate-500/30"
    )}>
    <Flame className={cn("w-4 h-4", streak > 0 ? "text-orange-400" : "text-slate-500")} />
    </div>
    <div>
    <p className="text-xs text-slate-500 uppercase tracking-wide">Streak</p>
    <p className="text-lg font-bold text-white">{streak}d</p>
    </div>
    </div>

    {/* Today's Reviews */}
    <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/5">
    <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
    <TrendingUp className="w-4 h-4 text-cyan-400" />
    </div>
    <div>
    <p className="text-xs text-slate-500 uppercase tracking-wide">Today</p>
    <p className="text-lg font-bold text-white">{reviewsToday}</p>
    </div>
    </div>

    {/* Total Cards */}
    <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/5">
    <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
    <Calendar className="w-4 h-4 text-purple-400" />
    </div>
    <div>
    <p className="text-xs text-slate-500 uppercase tracking-wide">Cards</p>
    <p className="text-lg font-bold text-white">{overview?.total_cards || 0}</p>
    </div>
    </div>
    </div>
    </div>
    </motion.div>
  );
}
