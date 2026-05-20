/**
 * StreakCard - Study streak visualization with gamification
 * 
 * Features:
 * - Streak level progression (Building → Committed → Master → Legendary)
 * - Progress bar to next week milestone
 * - Record indicator
 */

import { motion } from "framer-motion";
import { Flame, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/shared/ui";

export interface StreakCardProps {
    streakDays: number;
    longestStreak?: number;
}

function getStreakLevel(streakDays: number) {
    if (streakDays >= 100)
        return { label: "Legendary", color: "from-primary to-destructive" };
    if (streakDays >= 30)
        return { label: "Master", color: "from-orange-500 to-red-500" };
    if (streakDays >= 7)
        return { label: "Committed", color: "from-yellow-500 to-orange-500" };
    return { label: "Building", color: "from-muted-foreground to-muted-foreground" };
}

export function StreakCard({ streakDays, longestStreak }: StreakCardProps) {
    const isActive = streakDays > 0;
    const isRecord = longestStreak && streakDays >= longestStreak;
    const level = getStreakLevel(streakDays);

    return (
        <GlassCard hover className="p-6">
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div
                            className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                                isActive
                                    ? "bg-orange-500/20 border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.3)]"
                                    : "bg-muted border-border",
                            )}
                        >
                            <Flame
                                className={cn(
                                    "w-5 h-5",
                                    isActive ? "text-orange-400" : "text-muted-foreground",
                                )}
                            />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-foreground">Study Streak</h3>
                            <p className="text-xs text-muted-foreground">{level.label}</p>
                        </div>
                    </div>

                    {isRecord && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="px-2 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30"
                        >
                            <span className="text-xs font-bold text-yellow-400">Record!</span>
                        </motion.div>
                    )}
                </div>

                {/* Streak Counter */}
                <div className="relative">
                    <div
                        className={cn(
                            "text-4xl font-bold bg-gradient-to-r bg-clip-text text-transparent",
                            `bg-gradient-to-r ${level.color}`,
                        )}
                    >
                        {streakDays}
                        <span className="text-2xl ml-1 text-muted-foreground">days</span>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 h-2 bg-foreground/10 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{
                                width: `${Math.min(((streakDays % 7) / 7) * 100, 100)}%`,
                            }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className={cn(
                                "h-full rounded-full",
                                `bg-gradient-to-r ${level.color}`,
                            )}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        {streakDays % 7 === 0
                            ? "Week complete!"
                            : `${7 - (streakDays % 7)} days to next week`}
                    </p>
                </div>

                {/* Stats */}
                {longestStreak && (
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span className="text-xs">Longest Streak</span>
                        </div>
                        <span className="text-sm font-bold text-foreground">
                            {longestStreak} days
                        </span>
                    </div>
                )}
            </div>
        </GlassCard>
    );
}
