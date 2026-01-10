/**
 * ActivityFeed - Live activity stream
 * 
 * Displays:
 * - List of recent activities (from session tracking)
 * - Session stats when active
 * - Empty state when no activity
 */

import { Activity, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import GlassCard from "@/components/ui/GlassCard";
import { useSessionTracking } from "../hooks";
import { ActivityItem } from "./ActivityItem";
import { useActivityFilter } from "../state";

interface ActivityFeedProps {
    className?: string;
}

export function ActivityFeed({ className }: ActivityFeedProps) {
    const { activityLog, isInSession, currentSession } = useSessionTracking();
    const filter = useActivityFilter();

    // Filter activities
    const filteredActivities = activityLog.filter((activity) => {
        if (filter === "all") return true;
        return activity.type.toLowerCase().includes(filter);
    });

    return (
        <GlassCard className={cn("p-6", className)}>
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-purple-400" />
                        <h3 className="text-lg font-semibold text-white">
                            Recent Activity
                        </h3>
                    </div>
                    {isInSession && currentSession && (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30">
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-xs font-semibold text-green-400">
                                Active Session
                            </span>
                        </div>
                    )}
                </div>

                {/* Activity List */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {filteredActivities.length === 0 ? (
                        <div className="text-center py-12">
                            <Clock className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                            <p className="text-slate-400">No recent activity</p>
                            <p className="text-sm text-slate-500 mt-1">
                                Start studying to see your activity here
                            </p>
                        </div>
                    ) : (
                        filteredActivities
                            .slice(0, 20)
                            .map((activity, index) => (
                                <ActivityItem
                                    key={activity.id}
                                    activity={activity}
                                    index={index}
                                />
                            ))
                    )}
                </div>

                {/* Session Stats */}
                {isInSession && currentSession && (
                    <div className="pt-4 border-t border-white/5">
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div>
                                <p className="text-xs text-slate-500 uppercase">Duration</p>
                                <p className="text-sm font-bold text-white">
                                    {Math.round(currentSession.duration / 60000)}m
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase">Activities</p>
                                <p className="text-sm font-bold text-white">
                                    {currentSession.activityCount}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase">Modules</p>
                                <p className="text-sm font-bold text-white">
                                    {currentSession.modulesUsed.length}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </GlassCard>
    );
}
